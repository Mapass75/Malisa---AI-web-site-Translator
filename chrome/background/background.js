import browser from '../shared/browser.js';
import { getSettings, hasPrivacyConsent } from '../shared/storage.js';
import { getCachedTranslations, cacheTranslations } from '../shared/cache.js';
import { dedupeBlocks } from '../shared/dedupe.js';
import { translate, processText, TEXT_TASKS, SUMMARY_LENGTHS } from '../shared/providers.js';
import { chunkBlocks, runConcurrent } from '../shared/batcher.js';
import { fetchModels, refreshAllModels } from '../shared/models.js';
import { PROVIDERS, getProviderLimits, isProviderReady, supportsTextTasks } from '../shared/types.js';
import { getUiLanguage, t } from '../shared/i18n.js';
import {
  assertTrustedSender,
  isValidLanguage,
  isValidProvider,
  sanitizeErrorMessage,
  validateBlocks,
  validateOllamaBaseUrl,
  validateSelectionText,
  validateTtsText,
} from '../shared/security.js';
import { fetchSpeech } from '../shared/tts.js';

const CONTEXT_MENU_ID = 'malisa-translate-selection';
const PAGE_MENU_ID = 'malisa-translate-page';
let settingsCache = null;
let settingsCacheTime = 0;
const SETTINGS_TTL = 60000;

async function getCachedSettings() {
  if (settingsCache && Date.now() - settingsCacheTime < SETTINGS_TTL) {
    return settingsCache;
  }
  settingsCache = await getSettings();
  settingsCacheTime = Date.now();
  return settingsCache;
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    settingsCache = null;
    if (changes.settings.newValue?.uiLanguage !== changes.settings.oldValue?.uiLanguage) {
      setupContextMenu().catch(() => {});
    }
  }
});

async function setupContextMenu() {
  const lang = await getUiLanguage();
  await browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: t('contextMenuTranslate', lang),
    contexts: ['selection'],
  });
  browser.contextMenus.create({
    id: PAGE_MENU_ID,
    title: t('contextMenuTranslatePage', lang),
    contexts: ['page'],
  });
}

browser.runtime.onInstalled.addListener(() => {
  setupContextMenu().catch(() => {});
  getCachedSettings();
});

browser.runtime.onStartup.addListener(() => {
  setupContextMenu().catch(() => {});
  getCachedSettings();
});

// MV3: onStartup does not always wake the service worker, so also (re)create the
// menus on every worker start — removeAll keeps this idempotent.
setupContextMenu().catch(() => {});
function notifyTab(tabId, message, frameId) {
  if (!tabId) return;
  browser.tabs
    .sendMessage(tabId, message, frameId == null ? {} : { frameId })
    .catch(() => {});
}

async function notifyTabEnsured(tabId, message) {
  if (!tabId) return;
  try {
    await browser.tabs.sendMessage(tabId, message);
  } catch {
    await browser.scripting.executeScript({ target: { tabId }, files: ['content/content.js'] });
    await browser.tabs.sendMessage(tabId, message);
  }
}
function createProgressThrottle(tabId, frameId) {
  let last = 0;
  return (done, total) => {
    const now = Date.now();
    if (done < total && now - last < 400) return;
    last = now;
    notifyTab(tabId, { type: 'TRANSLATION_PROGRESS', done, total }, frameId);
  };
}

function sortBatchesLargestFirst(batches) {
  return batches
    .map((batch, index) => ({ batch, index, size: batch.reduce((s, b) => s + b.text.length, 0) }))
    .sort((a, b) => b.size - a.size)
    .map((item) => item.batch);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isTransientError(message) {
  return /429|rate.?limit|too many|timeout|timed out|network|failed to fetch|500|502|503|504|overload/i.test(
    message
  );
}

async function translateBatchWithRetry(provider, translateOpts, batch, retried = false) {
  try {
    return await translate(provider, { ...translateOpts, blocks: batch });
  } catch (err) {
    // One backoff retry for transient failures (rate limits, 5xx, network).
    if (!retried && isTransientError(err.message)) {
      await sleep(2000);
      return translateBatchWithRetry(provider, translateOpts, batch, true);
    }
    const retryable =
      batch.length >= 4 &&
      /did not translate|format mismatch|not valid JSON|No text was translated/i.test(err.message);
    if (!retryable) throw err;

    const mid = Math.ceil(batch.length / 2);
    const first = await translateBatchWithRetry(provider, translateOpts, batch.slice(0, mid));
    const second = await translateBatchWithRetry(provider, translateOpts, batch.slice(mid));
    return [...first, ...second];
  }
}

function isDomainSkipped(url, skipDomains) {
  if (!Array.isArray(skipDomains) || !skipDomains.length) return false;
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return skipDomains.some((d) => {
    const dom = String(d).trim().toLowerCase();
    return dom && (host === dom || host.endsWith('.' + dom));
  });
}

async function resolveProvider(settings, provider = settings.activeProvider) {
  if (!(await hasPrivacyConsent())) {
    throw new Error('Privacy consent required. Open Settings to continue.');
  }
  if (!isValidProvider(provider)) {
    throw new Error('Invalid AI provider');
  }
  const providerConfig = settings.providers[provider];
  if (!isProviderReady(provider, providerConfig)) {
    throw new Error(`Provider ${provider} is not configured. Open Settings.`);
  }
  if (provider === 'ollama' && !validateOllamaBaseUrl(providerConfig.baseUrl)) {
    throw new Error('Invalid Ollama URL');
  }
  return {
    provider,
    translateOpts: {
      apiKey: providerConfig.apiKey,
      model: providerConfig.model,
      baseUrl: providerConfig.baseUrl,
      ...(provider === 'free' ? { email: providerConfig.email } : {}),
      ...(provider === 'ollama'
        ? {
            temperature: providerConfig.temperature,
            numCtx: providerConfig.numCtx,
            keepAlive: providerConfig.keepAlive,
            timeout: providerConfig.timeout,
          }
        : {}),
    },
    cacheEnabled: settings.translationCacheEnabled !== false,
  };
}

async function translateSingleText(text, targetLanguage, providerId, sourceLanguage = 'auto') {
  const settings = await getCachedSettings();
  const { provider, translateOpts, cacheEnabled } = await resolveProvider(settings, providerId);
  const cached = await getCachedTranslations(
    [text],
    targetLanguage,
    cacheEnabled,
    sourceLanguage
  );
  if (cached.has(text)) return cached.get(text);

  const results = await translateBatchWithRetry(
    provider,
    { ...translateOpts, targetLanguage, sourceLanguage },
    [{ id: '0', text }]
  );
  const translated = results[0]?.translated ?? text;
  cacheTranslations(
    [{ text, translation: translated }],
    targetLanguage,
    cacheEnabled,
    sourceLanguage
  ).catch(() => {});
  return translated;
}

const POPUP_TEXT_LIMIT = 40000;
const POPUP_CHUNK_SIZE = 3000;

function validatePopupText(text) {
  if (typeof text !== 'string') throw new Error('No text to translate');
  const trimmed = text.trim();
  if (!trimmed || !/\p{L}/u.test(trimmed)) throw new Error('No text to translate');
  if (trimmed.length > POPUP_TEXT_LIMIT) {
    throw new Error(`Text is too long (${trimmed.length} chars, max ${POPUP_TEXT_LIMIT})`);
  }
  return trimmed;
}

// Split long popup input at paragraph/space boundaries; the exact separator
// is kept so the translated chunks can be reassembled faithfully. Fixed-length
// fallback cuts are moved to a code-point boundary to avoid splitting
// surrogate pairs (e.g. emoji).
function chunkPopupText(text) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > POPUP_CHUNK_SIZE) {
    let cut = remaining.lastIndexOf('\n', POPUP_CHUNK_SIZE);
    let sepLen = 1;
    if (cut < POPUP_CHUNK_SIZE / 2) cut = remaining.lastIndexOf(' ', POPUP_CHUNK_SIZE);
    if (cut < POPUP_CHUNK_SIZE / 2) {
      cut = POPUP_CHUNK_SIZE;
      sepLen = 0;
      // Don't split a surrogate pair: back off while the char before the cut
      // is a high surrogate.
      while (cut > 0 && /[\uD800-\uDBFF]/.test(remaining[cut - 1])) cut--;
    }
    chunks.push({ text: remaining.slice(0, cut), sep: remaining.slice(cut, cut + sepLen) });
    remaining = remaining.slice(cut + sepLen);
  }
  if (remaining) chunks.push({ text: remaining, sep: '' });
  return chunks;
}

async function translatePopupText(text, targetLanguage, providerId, sourceLanguage = 'auto') {
  const chunks = chunkPopupText(validatePopupText(text));
  let result = '';
  for (const chunk of chunks) {
    result +=
      (await translateSingleText(chunk.text, targetLanguage, providerId, sourceLanguage)) +
      chunk.sep;
  }
  return result;
}

async function translateAllBlocks(blocks, targetLanguage, tabId, frameId) {
  if (!isValidLanguage(targetLanguage)) {
    throw new Error('Invalid target language');
  }

  const safeBlocks = validateBlocks(blocks);
  const settings = await getCachedSettings();
  const tab = await browser.tabs.get(tabId).catch(() => null);
  if (tab?.url && isDomainSkipped(tab.url, settings.skipDomains)) return;
  const { provider, translateOpts, cacheEnabled } = await resolveProvider(settings);

  const limits = getProviderLimits(provider, settings);
  const texts = safeBlocks.map((b) => b.text);
  const cached = await getCachedTranslations(texts, targetLanguage, cacheEnabled);

  const cachedResults = [];
  const uncachedBlocks = [];

  for (const block of safeBlocks) {
    if (cached.has(block.text)) {
      cachedResults.push({ id: block.id, translated: cached.get(block.text) });
    } else {
      uncachedBlocks.push(block);
    }
  }

  if (cachedResults.length) {
    notifyTab(tabId, { type: 'APPLY_TRANSLATIONS', results: cachedResults }, frameId);
  }
  if (!uncachedBlocks.length) return;

  const batches = sortBatchesLargestFirst(
    chunkBlocks(uncachedBlocks, limits.batchSize, limits.maxChars)
  );
  const onProgress = batches.length > 2 ? createProgressThrottle(tabId, frameId) : () => {};

  translateOpts.targetLanguage = targetLanguage;

  await runConcurrent(
    batches,
    limits.parallel,
    async (batch) => {
      const { uniqueBlocks, expandResults, cacheEntries } = dedupeBlocks(batch);
      const dedupedResults = await translateBatchWithRetry(provider, translateOpts, uniqueBlocks);
      const translated = expandResults(dedupedResults);
      notifyTab(tabId, { type: 'APPLY_TRANSLATIONS', results: translated }, frameId);
      cacheTranslations(cacheEntries(dedupedResults), targetLanguage, cacheEnabled).catch(() => {});
      return translated;
    },
    onProgress
  );
}

async function translateSelection(text, tabId) {
  const trimmed = validateSelectionText(text);
  const settings = await getCachedSettings();
  const targetLanguage = settings.defaultLanguage;

  if (!isValidLanguage(targetLanguage)) {
    throw new Error('Invalid target language');
  }

  const translated = await translateSingleText(trimmed, targetLanguage);

  await notifyTabEnsured(tabId, {
    type: 'SELECTION_TRANSLATED',
    original: trimmed,
    translated,
    targetLanguage,
  });
}

function showTabNotice(tabId, text) {
  browser.action.setBadgeText({ tabId, text: text ? '!' : '' }).catch(() => {});
  if (text) browser.action.setBadgeBackgroundColor({ tabId, color: '#d93025' }).catch(() => {});
  browser.action.setTitle({ tabId, title: text || '' }).catch(() => {});
}

// Same flow as the popup's "Translate page" button, using the saved provider and target language.
async function translatePageFromMenu(tabId) {
  showTabNotice(tabId, '');
  const [settings, lang] = await Promise.all([getSettings(), getUiLanguage()]);
  const provider = settings.activeProvider;
  const targetLanguage = settings.defaultLanguage;
  let setupError = '';
  if (!isProviderReady(provider, settings.providers?.[provider])) {
    setupError = PROVIDERS[provider]?.apiKeyOptional
      ? t('setProviderUrl', lang)
      : t('enterApiKey', lang, { provider: PROVIDERS[provider]?.label ?? provider });
  } else if (!isValidLanguage(targetLanguage)) {
    setupError = 'Invalid target language';
  }
  if (setupError) {
    await notifyTabEnsured(tabId, { type: 'SELECTION_ERROR', error: setupError }).catch(() =>
      showTabNotice(tabId, setupError)
    );
    browser.runtime.openOptionsPage().catch(() => {});
    return;
  }
  try {
    await notifyTabEnsured(tabId, { type: 'TRANSLATE_PAGE', targetLanguage });
  } catch {
    showTabNotice(tabId, t('contextMenuPageUnavailable', lang));
  }
}

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === PAGE_MENU_ID) {
    if (tab?.id) translatePageFromMenu(tab.id).catch(() => {});
    return;
  }
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.id) return;
  const text = info.selectionText?.trim();
  if (!text) return;

  notifyTabEnsured(tab.id, { type: 'SELECTION_TRANSLATING' }).catch(() => {});
  translateSelection(text, tab.id).catch((err) => {
    notifyTabEnsured(tab.id, {
      type: 'SELECTION_ERROR',
      error: sanitizeErrorMessage(err.message),
    }).catch(() => {});
  });
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {  try {
    assertTrustedSender(sender);
  } catch (err) {
    sendResponse({ ok: false, error: err.message });
    return false;
  }

  if (message.type === 'TRANSLATE_PAGE') {
    const tabId = sender.tab?.id;
    if (!tabId) {
      sendResponse({ ok: false, error: 'Translation is only available on web pages' });
      return false;
    }

    const frameId = sender.frameId;
    translateAllBlocks(message.blocks, message.targetLanguage, tabId, frameId)
      .then(() => notifyTab(tabId, { type: 'TRANSLATION_DONE' }, frameId))
      .catch((err) =>
        notifyTab(tabId, { type: 'TRANSLATION_ERROR', error: sanitizeErrorMessage(err.message) }, frameId)
      );
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'TRANSLATE_TEXT') {
    try {
      validatePopupText(message.text);
      if (!isValidLanguage(message.targetLanguage)) {
        throw new Error('Invalid target language');
      }
      translatePopupText(
        message.text,
        message.targetLanguage,
        message.provider,
        message.sourceLanguage
      )
        .then((translated) => sendResponse({ ok: true, translated }))
        .catch((err) => sendResponse({ ok: false, error: sanitizeErrorMessage(err.message) }));
    } catch (err) {
      sendResponse({ ok: false, error: sanitizeErrorMessage(err.message) });
    }
    return true;
  }

  if (message.type === 'PROCESS_TEXT') {
    try {
      const text = validatePopupText(message.text);
      if (!TEXT_TASKS.includes(message.task)) throw new Error('Invalid text task');
      if (message.task === 'summarize' && !isValidLanguage(message.targetLanguage)) {
        throw new Error('Invalid target language');
      }
      const length = SUMMARY_LENGTHS.includes(message.length) ? message.length : 'medium';
      if (!isValidProvider(message.provider)) throw new Error('Invalid AI provider');
      if (!supportsTextTasks(message.provider)) {
        sendResponse({ ok: false, code: 'unsupported', error: 'Provider does not support this action' });
        return false;
      }
      getCachedSettings()
        .then((settings) => resolveProvider(settings, message.provider))
        .then(({ provider, translateOpts }) =>
          processText(provider, {
            ...translateOpts,
            task: message.task,
            text,
            targetLanguage: message.targetLanguage,
            length,
          })
        )
        .then((result) => sendResponse({ ok: true, result }))
        .catch((err) => sendResponse({ ok: false, error: sanitizeErrorMessage(err.message) }));
    } catch (err) {
      sendResponse({ ok: false, error: sanitizeErrorMessage(err.message) });
    }
    return true;
  }

  if (message.type === 'FETCH_MODELS') {
    if (!isValidProvider(message.provider)) {
      sendResponse({ ok: false, error: 'Unknown provider' });
      return false;
    }
    fetchModels(message.provider, message.config, !!message.force)
      .then((models) => sendResponse({ ok: true, models }))
      .catch((err) => sendResponse({ ok: false, error: sanitizeErrorMessage(err.message) }));
    return true;
  }

  if (message.type === 'REFRESH_ALL_MODELS') {
    refreshAllModels(message.providers ?? {})
      .then((results) => sendResponse({ ok: true, results }))
      .catch((err) => sendResponse({ ok: false, error: sanitizeErrorMessage(err.message) }));
    return true;
  }

  if (message.type === 'GET_TTS_SETTINGS') {
    getCachedSettings()
      .then((settings) =>
        sendResponse({
          ok: true,
          settings: {
            enabled: settings.selectionTtsEnabled !== false,
            speech: {
              engine: settings.speech?.engine ?? 'browser',
              voice: settings.speech?.voice ?? '',
              rate: settings.speech?.rate ?? 1,
              pitch: settings.speech?.pitch ?? 1,
            },
          },
        })
      )
      .catch((err) => sendResponse({ ok: false, error: sanitizeErrorMessage(err.message) }));
    return true;
  }

  if (message.type === 'SPEAK_SELECTION') {
    const text = validateTtsText(message.text);
    getCachedSettings()
      .then(async (settings) => {
        if (settings.selectionTtsEnabled === false) {
          throw new Error('Text-to-speech is disabled in Settings');
        }
        const engine = settings.speech?.engine ?? 'browser';
        if (engine === 'browser') throw new Error('Browser voices play in the page');
        const audio = await fetchSpeech(
          engine,
          text,
          { ...settings.speech, lang: message.lang || settings.defaultLanguage },
          {
            geminiKey: settings.providers?.google?.apiKey,
            openaiKey: settings.providers?.openai?.apiKey,
          }
        );
        sendResponse({ ok: true, ...audio });
      })
      .catch((err) => sendResponse({ ok: false, error: sanitizeErrorMessage(err.message) }));
    return true;
  }

  return false;
});
