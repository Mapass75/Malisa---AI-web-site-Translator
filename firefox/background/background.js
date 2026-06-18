import { getSettings } from '../shared/storage.js';
import { getCachedTranslations, cacheTranslations } from '../shared/cache.js';
import { dedupeBlocks } from '../shared/dedupe.js';
import { translate } from '../shared/providers.js';
import { chunkBlocks, runConcurrent } from '../shared/batcher.js';
import { fetchModels, refreshAllModels } from '../shared/models.js';
import { getProviderLimits, isProviderReady } from '../shared/types.js';
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
import { fetchOpenAiSpeech, OPENAI_TTS_MODELS, OPENAI_TTS_VOICES } from '../shared/tts.js';

const CONTEXT_MENU_ID = 'malisa-translate-selection';
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

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    settingsCache = null;
    if (changes.settings.newValue?.uiLanguage !== changes.settings.oldValue?.uiLanguage) {
      setupContextMenu().catch(() => {});
    }
  }
});

async function setupContextMenu() {
  const lang = await getUiLanguage();
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: t('contextMenuTranslate', lang),
    contexts: ['selection'],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  setupContextMenu().catch(() => {});
  getCachedSettings();
});

chrome.runtime.onStartup.addListener(() => {
  setupContextMenu().catch(() => {});
  getCachedSettings();
});
function notifyTab(tabId, message) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, message).catch(() => {});
}

async function notifyTabEnsured(tabId, message) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content/content.js'] });
    await chrome.tabs.sendMessage(tabId, message);
  }
}
function createProgressThrottle(tabId) {
  let last = 0;
  return (done, total) => {
    const now = Date.now();
    if (done < total && now - last < 400) return;
    last = now;
    notifyTab(tabId, { type: 'TRANSLATION_PROGRESS', done, total });
  };
}

function sortBatchesLargestFirst(batches) {
  return batches
    .map((batch, index) => ({ batch, index, size: batch.reduce((s, b) => s + b.text.length, 0) }))
    .sort((a, b) => b.size - a.size)
    .map((item) => item.batch);
}

async function translateBatchWithRetry(provider, translateOpts, batch) {
  try {
    return await translate(provider, { ...translateOpts, blocks: batch });
  } catch (err) {
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

async function translateAllBlocks(blocks, targetLanguage, tabId) {
  if (!isValidLanguage(targetLanguage)) {
    throw new Error('Invalid target language');
  }

  const safeBlocks = validateBlocks(blocks);
  const settings = await getCachedSettings();
  const provider = settings.activeProvider;

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

  const limits = getProviderLimits(provider, settings);
  const texts = safeBlocks.map((b) => b.text);
  const cacheEnabled = settings.translationCacheEnabled !== false;
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
    notifyTab(tabId, { type: 'APPLY_TRANSLATIONS', results: cachedResults });
  }
  if (!uncachedBlocks.length) return;

  const batches = sortBatchesLargestFirst(
    chunkBlocks(uncachedBlocks, limits.batchSize, limits.maxChars)
  );
  const onProgress = batches.length > 2 ? createProgressThrottle(tabId) : () => {};

  const translateOpts = {
    targetLanguage,
    apiKey: providerConfig.apiKey,
    model: providerConfig.model,
    baseUrl: providerConfig.baseUrl,
  };

  await runConcurrent(
    batches,
    limits.parallel,
    async (batch) => {
      const { uniqueBlocks, expandResults, cacheEntries } = dedupeBlocks(batch);
      const dedupedResults = await translateBatchWithRetry(provider, translateOpts, uniqueBlocks);
      const translated = expandResults(dedupedResults);
      notifyTab(tabId, { type: 'APPLY_TRANSLATIONS', results: translated });
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
  const provider = settings.activeProvider;

  if (!isValidLanguage(targetLanguage)) {
    throw new Error('Invalid target language');
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

  const cacheEnabled = settings.translationCacheEnabled !== false;
  const cached = await getCachedTranslations([trimmed], targetLanguage, cacheEnabled);
  if (cached.has(trimmed)) {
    await notifyTabEnsured(tabId, {
      type: 'SELECTION_TRANSLATED',
      original: trimmed,
      translated: cached.get(trimmed),
      targetLanguage,
    });
    return;
  }

  const translateOpts = {
    targetLanguage,
    apiKey: providerConfig.apiKey,
    model: providerConfig.model,
    baseUrl: providerConfig.baseUrl,
  };
  const results = await translateBatchWithRetry(provider, translateOpts, [{ id: '0', text: trimmed }]);
  const translated = results[0]?.translated ?? trimmed;

  cacheTranslations([{ text: trimmed, translation: translated }], targetLanguage, cacheEnabled).catch(
    () => {}
  );

  await notifyTabEnsured(tabId, {
    type: 'SELECTION_TRANSLATED',
    original: trimmed,
    translated,
    targetLanguage,
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {  try {
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

    translateAllBlocks(message.blocks, message.targetLanguage, tabId)
      .then(() => notifyTab(tabId, { type: 'TRANSLATION_DONE' }))
      .catch((err) =>
        notifyTab(tabId, { type: 'TRANSLATION_ERROR', error: sanitizeErrorMessage(err.message) })
      );
    sendResponse({ ok: true });
    return false;
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
            engine: settings.selectionTtsEngine === 'openai' ? 'openai' : 'browser',
            voice: settings.selectionTtsVoice ?? 'nova',
            model: settings.selectionTtsModel ?? 'tts-1',
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
        if (settings.selectionTtsEngine !== 'openai') {
          throw new Error('AI TTS is not enabled');
        }
        const openai = settings.providers?.openai;
        if (!openai?.apiKey) {
          throw new Error('OpenAI API key is not configured');
        }
        const voice = OPENAI_TTS_VOICES.includes(settings.selectionTtsVoice)
          ? settings.selectionTtsVoice
          : 'nova';
        const model = OPENAI_TTS_MODELS.includes(settings.selectionTtsModel)
          ? settings.selectionTtsModel
          : 'tts-1';
        const audio = await fetchOpenAiSpeech({
          text,
          apiKey: openai.apiKey,
          voice,
          model,
        });
        sendResponse({ ok: true, ...audio });
      })
      .catch((err) => sendResponse({ ok: false, error: sanitizeErrorMessage(err.message) }));
    return true;
  }

  return false;
});
