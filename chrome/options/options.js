import browser from '../shared/browser.js';
import { getSettings, saveSettings, hasPrivacyConsent, setPrivacyConsent } from '../shared/storage.js';
import {
  LANGUAGES,
  PROVIDERS,
  PROVIDER_KEY_URLS,
  OLLAMA_DOWNLOAD_URL,
  FREE_TIER_INFO,
  FREE_TIER_CHECKED,
  SPEECH_ENGINES,
} from '../shared/types.js';
import { getCachedModels } from '../shared/models.js';
import { clearTranslationCache, countTranslationCacheEntries } from '../shared/cache.js';
import { escapeHtml, validateOllamaBaseUrl, sanitizeApiKey, sanitizeHeaderValue } from '../shared/security.js';
import { UI_LANGUAGES, t } from '../shared/i18n.js';
import { OPENAI_TTS_MODELS, OPENAI_TTS_VOICES, fetchSpeech, splitForSpeech } from '../shared/tts.js';

const uiLanguage = document.getElementById('uiLanguage');
const privacyCard = document.getElementById('privacyCard');
const settingsContent = document.getElementById('settingsContent');
const privacyConsent = document.getElementById('privacyConsent');
const acceptPrivacyBtn = document.getElementById('acceptPrivacyBtn');
const defaultLanguage = document.getElementById('defaultLanguage');
const activeProvider = document.getElementById('activeProvider');
const batchSize = document.getElementById('batchSize');
const parallelRequests = document.getElementById('parallelRequests');
const skipDomains = document.getElementById('skipDomains');
const translationCacheEnabled = document.getElementById('translationCacheEnabled');
const translationCacheCount = document.getElementById('translationCacheCount');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const clearCacheStatus = document.getElementById('clearCacheStatus');
const selectionTtsEnabled = document.getElementById('selectionTtsEnabled');
const selectionTtsEngine = document.getElementById('selectionTtsEngine');
const selectionTtsVoice = document.getElementById('selectionTtsVoice');
const selectionTtsModel = document.getElementById('selectionTtsModel');
const selectionTtsOpenAiFields = document.getElementById('selectionTtsOpenAiFields');
const speechEngine = document.getElementById('speechEngine');
const speechVoice = document.getElementById('speechVoice');
const speechRate = document.getElementById('speechRate');
const speechPitch = document.getElementById('speechPitch');
const speechEngineInfo = document.getElementById('speechEngineInfo');
const speechEngineLink = document.getElementById('speechEngineLink');
const speechGoogleKey = document.getElementById('speechGoogleKey');
const speechGoogleVoice = document.getElementById('speechGoogleVoice');
const speechGeminiModel = document.getElementById('speechGeminiModel');
const speechElevenlabsKey = document.getElementById('speechElevenlabsKey');
const speechElevenlabsVoiceId = document.getElementById('speechElevenlabsVoiceId');
const speechTestBtn = document.getElementById('speechTestBtn');
const speechTestStatus = document.getElementById('speechTestStatus');
const providerSections = document.getElementById('providerSections');
const refreshAllBtn = document.getElementById('refreshAllBtn');
const refreshStatus = document.getElementById('refreshStatus');
const saveBtn = document.getElementById('saveBtn');
const saveStatus = document.getElementById('saveStatus');

const providerEls = {};
const themeSegmentButtons = document.querySelectorAll('.theme-segment-btn');
let lang = 'en';
let selectedTranslatorTheme = 'system';
function applyOptionsI18n() {
  document.documentElement.lang = lang;
  document.title = t('optionsTitle', lang);
  document.getElementById('pageSubtitle').textContent = t('optionsSubtitle', lang);
  document.getElementById('privacyTitle').textContent = t('privacyTitle', lang);
  document.getElementById('privacyBody').textContent = t('privacyBody', lang);
  document.getElementById('privacyConsentText').textContent = t('privacyConsent', lang) + ' ';
  document.getElementById('privacyPolicyLink').textContent = t('privacyPolicy', lang);
  document.getElementById('privacyAgreeText').textContent = ' ' + t('privacyAgree', lang);
  acceptPrivacyBtn.textContent = t('acceptContinue', lang);
  document.getElementById('generalTitle').textContent = t('generalSettings', lang);
  document.getElementById('labelUiLanguage').textContent = t('uiLanguage', lang);
  document.getElementById('labelDefaultLanguage').textContent = t('defaultTargetLanguage', lang);
  document.getElementById('labelActiveProvider').textContent = t('defaultProvider', lang);
  document.getElementById('labelBatchSize').textContent = t('batchSize', lang);
  document.getElementById('labelParallel').textContent = t('parallelRequests', lang);
  document.getElementById('batchHint').textContent = t('batchHint', lang);
  document.getElementById('labelSkipDomains').textContent = t('skipDomains', lang);
  document.getElementById('selectionTtsTitle').textContent = t('selectionTtsTitle', lang);
  document.getElementById('selectionTtsEnableLabel').textContent = t('selectionTtsEnable', lang);
  document.getElementById('labelSelectionTtsEngine').textContent = t('selectionTtsEngine', lang);
  document.getElementById('selectionTtsEngineBrowserOpt').textContent = t('selectionTtsEngineBrowser', lang);
  document.getElementById('selectionTtsEngineOpenaiOpt').textContent = t('selectionTtsEngineOpenai', lang);
  document.getElementById('labelSelectionTtsVoice').textContent = t('selectionTtsVoice', lang);
  document.getElementById('labelSelectionTtsModel').textContent = t('selectionTtsModel', lang);
  document.getElementById('selectionTtsHint').textContent = t('selectionTtsHint', lang);
  document.getElementById('speechTitle').textContent = t('speechTitle', lang);
  document.getElementById('labelSpeechEngine').textContent = t('speechEngine', lang);
  document.getElementById('labelSpeechVoice').textContent = t('speechVoice', lang);
  document.getElementById('labelSpeechGoogleKey').textContent = t('speechGoogleKey', lang);
  document.getElementById('labelSpeechVoiceName').textContent = t('speechVoiceName', lang);
  document.getElementById('labelSpeechGeminiModel').textContent = t('speechGeminiModel', lang);
  document.getElementById('speechGeminiHint').textContent = t('speechGeminiHint', lang);
  document.getElementById('labelSpeechElevenlabsKey').textContent = t('speechElevenlabsKey', lang);
  document.getElementById('labelSpeechElevenlabsVoice').textContent = t('speechElevenlabsVoice', lang);
  document.getElementById('labelSpeechRate').textContent = t('speechRate', lang);
  document.getElementById('labelSpeechPitch').textContent = t('speechPitch', lang);
  speechTestBtn.textContent = t('speechTest', lang);
  document.getElementById('cacheTitle').textContent = t('cacheTitle', lang);
  document.getElementById('translationCacheLabel').textContent = t('translationCacheEnable', lang);
  document.getElementById('translationCacheHint').textContent = t('translationCacheHint', lang);
  clearCacheBtn.textContent = t('clearTranslationCache', lang);
  document.getElementById('labelTranslatorTheme').textContent = t('translatorTheme', lang);
  document.getElementById('settingsThemeLight').textContent = t('themeLight', lang);
  document.getElementById('settingsThemeDark').textContent = t('themeDark', lang);
  document.getElementById('settingsThemeSystem').textContent = t('themeSystem', lang);
  document.getElementById('translatorThemeHint').textContent = t('translatorThemeHint', lang);
  document.getElementById('translatorThemeToggle').setAttribute('aria-label', t('translatorTheme', lang));
  refreshAllBtn.textContent = t('refreshAllModels', lang);
  saveBtn.textContent = t('saveSettings', lang);
  document.getElementById('footerText').textContent = t('modelsFooter', lang);
  document.getElementById('footerPrivacyLink').textContent = t('privacyPolicy', lang);
  for (const id of Object.keys(PROVIDERS)) {
    if (!providerEls[id]?.key) continue;
    updateToggleKeyLabels(id);
    providerEls[id].test.textContent = t('testConnection', lang);
    providerEls[id].clearKey.title = t('clearApiKey', lang);
    providerEls[id].clearKey.setAttribute('aria-label', t('clearApiKey', lang));
  }
}

function populateUiLanguages(selected) {
  uiLanguage.innerHTML = UI_LANGUAGES.map(
    (l) => `<option value="${l.code}" ${l.code === selected ? 'selected' : ''}>${escapeHtml(l.name)}</option>`
  ).join('');
}

function populateLanguages(selected) {
  defaultLanguage.innerHTML = LANGUAGES.map(
    (l) => `<option value="${escapeHtml(l.code)}" ${l.code === selected ? 'selected' : ''}>${escapeHtml(l.name)}</option>`
  ).join('');
}

function populateProviders(selected) {
  activeProvider.innerHTML = Object.entries(PROVIDERS)
    .map(([id, p]) => `<option value="${escapeHtml(id)}" ${id === selected ? 'selected' : ''}>${escapeHtml(p.label)}</option>`)
    .join('');
}

function populateTtsVoices(selected) {
  selectionTtsVoice.innerHTML = OPENAI_TTS_VOICES.map(
    (voice) =>
      `<option value="${voice}" ${voice === selected ? 'selected' : ''}>${escapeHtml(voice)}</option>`
  ).join('');
}

function populateTtsModels(selected) {
  selectionTtsModel.innerHTML = OPENAI_TTS_MODELS.map(
    (model) =>
      `<option value="${model}" ${model === selected ? 'selected' : ''}>${escapeHtml(model)}</option>`
  ).join('');
}

function updateTtsOpenAiFieldsVisibility() {
  selectionTtsOpenAiFields.classList.toggle('hidden', selectionTtsEngine.value !== 'openai');
}

function populateSpeechEngines(selected) {
  speechEngine.innerHTML = Object.entries(SPEECH_ENGINES)
    .map(([id, e]) => `<option value="${id}" ${id === selected ? 'selected' : ''}>${escapeHtml(e.label)}</option>`)
    .join('');
}

function populateSpeechVoices(selected) {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const code = (defaultLanguage.value ?? '').split('-')[0].toLowerCase();
  const matching = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(code));
  const list = matching.length ? matching : voices;
  speechVoice.innerHTML =
    `<option value="">${t('autoDetect', lang)}</option>` +
    list
      .map(
        (v) =>
          `<option value="${escapeHtml(v.name)}" ${v.name === selected ? 'selected' : ''}>${escapeHtml(v.name)} (${escapeHtml(v.lang)})</option>`
      )
      .join('');
}

function updateSpeechFields() {
  const engine = speechEngine.value;
  document.getElementById('speechBrowserFields').hidden = engine !== 'browser';
  document.getElementById('speechGoogleFields').hidden = engine !== 'google';
  document.getElementById('speechGeminiFields').hidden = engine !== 'gemini';
  document.getElementById('speechElevenlabsFields').hidden = engine !== 'elevenlabs';
  const meta = SPEECH_ENGINES[engine];
  speechEngineInfo.textContent = `${meta.freeInfo} ${t('freeTierChecked', lang, { d: FREE_TIER_CHECKED })}`;
  if (meta.keyUrl) {
    speechEngineLink.hidden = false;
    speechEngineLink.innerHTML = `${t('noApiKey', lang)} <a href="${meta.keyUrl}" target="_blank" rel="noopener noreferrer">${t('getKeyHere', lang)}</a>`;
  } else {
    speechEngineLink.hidden = true;
  }
}

function collectSpeech() {
  return {
    engine: speechEngine.value,
    voice: speechVoice.value,
    rate: +speechRate.value || 1,
    pitch: +speechPitch.value || 1,
    googleKey: sanitizeApiKey(speechGoogleKey.value),
    googleVoice: speechGoogleVoice.value.trim() || 'en-US-Standard-A',
    geminiModel: speechGeminiModel.value.trim() || 'gemini-2.5-flash-preview-tts',
    elevenlabsKey: sanitizeApiKey(speechElevenlabsKey.value),
    elevenlabsVoiceId: speechElevenlabsVoiceId.value.trim(),
  };
}

async function testSpeech() {
  const cfg = collectSpeech();
  speechTestStatus.textContent = t('speechPlaying', lang);
  try {
    const sample = 'This is a Malisa speech test.';
    if (cfg.engine === 'browser') {
      if (!('speechSynthesis' in window)) throw new Error(t('noVoice', lang));
      const u = new SpeechSynthesisUtterance(sample);
      const voice = window.speechSynthesis.getVoices().find((v) => v.name === cfg.voice);
      if (voice) u.voice = voice;
      u.rate = cfg.rate;
      u.pitch = cfg.pitch;
      u.onend = u.onerror = () => (speechTestStatus.textContent = '');
      window.speechSynthesis.speak(u);
    } else {
      const s = await getSettings();
      for (const chunk of splitForSpeech(sample)) {
        const { audioBase64, mimeType } = await fetchSpeech(
          cfg.engine,
          chunk,
          cfg,
          s.providers?.google?.apiKey
        );
        const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
        audio.playbackRate = cfg.rate;
        await audio.play().catch(() => {});
      }
      speechTestStatus.textContent = '';
    }
  } catch (err) {
    speechTestStatus.textContent = err.message;
  }
}

function buildProviderSections() {
  providerSections.innerHTML = Object.entries(PROVIDERS)
    .map(([id, p]) => {
      const keyLabel = p.apiKeyOptional ? t('apiKeyOptional', lang) : t('apiKey', lang);
      const baseUrlHint = id === 'free' ? t('freeProviderNote', lang) : t('ollamaUrlHint', lang);
      const baseUrlField = p.defaultBaseUrl
        ? `<div class="field">
            <label for="${id}BaseUrl">${t('serverUrl', lang)}</label>
            <input type="text" id="${id}BaseUrl" placeholder="${p.defaultBaseUrl}" />
            <span class="hint">${baseUrlHint}</span>
          </div>`
        : '';
      const statusHint = p.noModel
        ? t('freeProviderReady', lang)
        : p.apiKeyOptional
          ? t('setUrlRefresh', lang)
          : t('setKeyRefresh', lang);
      const modelField = p.noModel
        ? `<span class="model-status" id="${id}Status">${statusHint}</span>`
        : id === 'ollama'
          ? `<div class="field">
              <label for="${id}Model">${t('model', lang)}</label>
              <div class="model-row">
                <input
                  type="text"
                  id="${id}Model"
                  list="${id}ModelList"
                  placeholder="${t('ollamaModelPlaceholder', lang)}"
                  autocomplete="off"
                />
                <datalist id="${id}ModelList"></datalist>
                <button type="button" class="btn-icon" id="${id}Refresh" title="${t('refreshModels', lang)}">↻</button>
              </div>
              <span class="hint">${t('ollamaModelHint', lang)}</span>
              <span class="model-status" id="${id}Status">${statusHint}</span>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="${id}Temperature">${t('ollamaTemperature', lang)}</label>
                <input type="number" id="${id}Temperature" min="0" max="2" step="0.1" placeholder="0.2" />
              </div>
              <div class="field">
                <label for="${id}NumCtx">${t('ollamaNumCtx', lang)}</label>
                <input type="number" id="${id}NumCtx" min="512" step="512" placeholder="${t('defaultHint', lang)}" />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label for="${id}KeepAlive">${t('ollamaKeepAlive', lang)}</label>
                <input type="text" id="${id}KeepAlive" placeholder="5m" />
              </div>
              <div class="field">
                <label for="${id}Timeout">${t('ollamaTimeout', lang)}</label>
                <input type="number" id="${id}Timeout" min="10" max="600" placeholder="120" />
              </div>
            </div>
            <span class="hint">${t('ollamaCorsNote', lang)}</span>
            <span class="hint key-link">${t('noOllama', lang)} <a href="${OLLAMA_DOWNLOAD_URL}" target="_blank" rel="noopener noreferrer">${t('downloadOllama', lang)}</a></span>`
          : `<div class="field">
              <label for="${id}Model">${t('model', lang)}</label>
              <div class="model-row">
                <select id="${id}Model"></select>
                <button type="button" class="btn-icon" id="${id}Refresh" title="${t('refreshModels', lang)}">↻</button>
              </div>
              <span class="model-status" id="${id}Status">${statusHint}</span>
            </div>`;

      const keyField = p.noApiKey
        ? ''
        : `<div class="field">
        <label for="${id}Key">${keyLabel}</label>
        <div class="key-row">
          <input type="password" id="${id}Key" class="key-input" placeholder="${p.keyPlaceholder}" autocomplete="off" />
          <button type="button" class="btn-icon" id="${id}ToggleKey" title="${t('showApiKey', lang)}" aria-label="${t('showApiKey', lang)}">&#128065;</button>
          <button type="button" class="btn-icon key-clear-btn" id="${id}ClearKey" title="${t('clearApiKey', lang)}" aria-label="${t('clearApiKey', lang)}">&times;</button>
          <button type="button" class="btn secondary btn-compact" id="${id}Test">${t('testConnection', lang)}</button>
        </div>
        <span class="key-status" id="${id}KeyStatus"></span>
        ${
          PROVIDER_KEY_URLS[id]
            ? `<span class="hint key-link" id="${id}KeyLink">${t('noApiKey', lang)} <a href="${PROVIDER_KEY_URLS[id]}" target="_blank" rel="noopener noreferrer">${t('getKeyHere', lang)}</a></span>`
            : ''
        }
      </div>`;

      const freeBadge = FREE_TIER_INFO[id]
        ? `<span class="badge" title="${escapeHtml(FREE_TIER_INFO[id] + ' ' + t('freeTierChecked', lang, { d: FREE_TIER_CHECKED }))}">${t('freeTier', lang)}</span>`
        : '';
      const emailField =
        id === 'free'
          ? `<div class="field">
            <label for="${id}Email">${t('freeEmailLabel', lang)}</label>
            <input type="email" id="${id}Email" autocomplete="off" />
          </div>`
          : '';

      return `
    <section class="card" data-provider="${id}">
      <h2>${p.label} ${freeBadge}</h2>
      ${baseUrlField}
      ${keyField}
      ${modelField}
      ${emailField}
    </section>`;
    })
    .join('');

  for (const id of Object.keys(PROVIDERS)) {
    providerEls[id] = {
      email: document.getElementById(`${id}Email`),
      key: document.getElementById(`${id}Key`),
      toggleKey: document.getElementById(`${id}ToggleKey`),
      clearKey: document.getElementById(`${id}ClearKey`),
      test: document.getElementById(`${id}Test`),
      keyStatus: document.getElementById(`${id}KeyStatus`),
      model: document.getElementById(`${id}Model`),
      refresh: document.getElementById(`${id}Refresh`),
      status: document.getElementById(`${id}Status`),
    };
    if (id === 'ollama') {
      providerEls[id].modelList = document.getElementById(`${id}ModelList`);
      providerEls[id].temperature = document.getElementById(`${id}Temperature`);
      providerEls[id].numCtx = document.getElementById(`${id}NumCtx`);
      providerEls[id].keepAlive = document.getElementById(`${id}KeepAlive`);
      providerEls[id].timeout = document.getElementById(`${id}Timeout`);
    }
    if (PROVIDERS[id].defaultBaseUrl) {
      providerEls[id].baseUrl = document.getElementById(`${id}BaseUrl`);
      providerEls[id].baseUrl.addEventListener('change', () => refreshProviderModels(id, true));
    }
    providerEls[id].keyLink = document.getElementById(`${id}KeyLink`);
    providerEls[id].refresh?.addEventListener('click', () => refreshProviderModels(id, true));
    providerEls[id].key?.addEventListener('change', () => refreshProviderModels(id, true));
    providerEls[id].key?.addEventListener('input', () => updateKeyLink(id));
    updateKeyLink(id);
    providerEls[id].toggleKey?.addEventListener('click', () => toggleKeyVisibility(id));
    providerEls[id].clearKey?.addEventListener('click', () => clearApiKey(id));
    providerEls[id].test?.addEventListener('click', () => testProviderConnection(id));
  }
}

function fillOllamaModelInput(models, selectedModel) {
  const input = providerEls.ollama.model;
  const datalist = providerEls.ollama.modelList;
  const current = selectedModel || input.value;

  datalist.innerHTML = (models ?? [])
    .map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.id)}</option>`)
    .join('');

  if (current) {
    input.value = current;
    return;
  }

  if (models?.length && !input.value) {
    input.value = models[0].id;
  }
}

function fillModelSelect(providerId, models, selectedModel) {
  if (providerId === 'ollama') {
    fillOllamaModelInput(models, selectedModel);
    return;
  }

  const select = providerEls[providerId].model;
  if (!models?.length) {
    select.innerHTML = selectedModel
      ? `<option value="${selectedModel}">${selectedModel}</option>`
      : '';
    return;
  }
  const ids = new Set(models.map((m) => m.id));
  select.innerHTML = models
    .map((m) => {
      const id = escapeHtml(m.id);
      const label = escapeHtml(m.name !== m.id ? `${m.name} (${m.id})` : m.id);
      return `<option value="${id}" ${m.id === selectedModel ? 'selected' : ''}>${label}</option>`;
    })
    .join('');
  if (selectedModel && !ids.has(selectedModel)) {
    const saved = escapeHtml(selectedModel);
    select.innerHTML =
      `<option value="${saved}">${t('savedModel', lang, { name: saved })}</option>` + select.innerHTML;
    select.value = selectedModel;
  }
}

function setProviderStatus(providerId, text, type = '') {
  const el = providerEls[providerId].status;
  el.textContent = text;
  el.className = `model-status${type ? ` ${type}` : ''}`;
}

function setKeyStatus(providerId, text, type = '') {
  const el = providerEls[providerId].keyStatus;
  el.textContent = text;
  el.className = `key-status${type ? ` ${type}` : ''}`;
}

function updateToggleKeyLabels(providerId) {
  const input = providerEls[providerId].key;
  const btn = providerEls[providerId].toggleKey;
  const label = input.type === 'password' ? t('showApiKey', lang) : t('hideApiKey', lang);
  btn.title = label;
  btn.setAttribute('aria-label', label);
}

function updateKeyLink(providerId) {
  const el = providerEls[providerId]?.keyLink;
  if (!el) return;
  el.hidden = !!(providerEls[providerId].key?.value ?? '').trim();
}

function toggleKeyVisibility(providerId) {
  const input = providerEls[providerId].key;
  input.type = input.type === 'password' ? 'text' : 'password';
  updateToggleKeyLabels(providerId);
}

function clearApiKey(providerId) {
  providerEls[providerId].key.value = '';
  providerEls[providerId].key.type = 'password';
  updateKeyLink(providerId);
  updateToggleKeyLabels(providerId);
  setKeyStatus(providerId, '');
}

async function testProviderConnection(providerId) {
  if (!canRefreshProvider(providerId)) {
    setKeyStatus(
      providerId,
      PROVIDERS[providerId].apiKeyOptional ? t('setUrlRefresh', lang) : t('setKeyRefresh', lang),
      'error'
    );
    return;
  }

  const btn = providerEls[providerId].test;
  btn.disabled = true;
  setKeyStatus(providerId, t('testingConnection', lang));

  try {
    const models = await fetchModelsFromBg(providerId, getProviderConfig(providerId), true);
    if (providerId === 'ollama' && !models.length) {
      setKeyStatus(providerId, t('connectionOkNoModels', lang), 'ok');
    } else {
      setKeyStatus(providerId, t('connectionOk', lang, { n: models.length }), 'ok');
      fillModelSelect(providerId, models, providerEls[providerId].model.value);
      setProviderStatus(providerId, t('activeModels', lang, { n: models.length }), 'ok');
    }
  } catch (err) {
    setKeyStatus(providerId, err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function refreshCacheCount() {
  const count = await countTranslationCacheEntries();
  translationCacheCount.textContent = t('translationCacheCount', lang, { n: count });
}

function setThemeSegmentButtons(activeTheme) {
  selectedTranslatorTheme = activeTheme;
  themeSegmentButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === activeTheme);
  });
}

function getProviderConfig(providerId) {
  const config = {
    apiKey: sanitizeApiKey(providerEls[providerId].key?.value),
    model: sanitizeHeaderValue(providerEls[providerId].model?.value),
  };
  if (providerEls[providerId].baseUrl) {
    config.baseUrl = providerEls[providerId].baseUrl.value.trim() || PROVIDERS[providerId].defaultBaseUrl;
  }
  if (providerId === 'free') {
    config.email = providerEls[providerId].email?.value?.trim() ?? '';
  }
  if (providerId === 'ollama') {
    config.temperature = providerEls[providerId].temperature?.value;
    config.numCtx = providerEls[providerId].numCtx?.value;
    config.keepAlive = providerEls[providerId].keepAlive?.value?.trim();
    config.timeout = providerEls[providerId].timeout?.value;
  }
  return config;
}

function canRefreshProvider(providerId) {
  const meta = PROVIDERS[providerId];
  if (meta.noModel) return false;
  const config = getProviderConfig(providerId);
  if (meta.apiKeyOptional) return !!config.baseUrl;
  return !!config.apiKey;
}

async function fetchModelsFromBg(provider, config, force = false) {
  return new Promise((resolve, reject) => {
    browser.runtime.sendMessage(
      { type: 'FETCH_MODELS', provider, config, force },
      (response) => {
        if (browser.runtime.lastError) return reject(new Error(browser.runtime.lastError.message));
        if (!response?.ok) return reject(new Error(response.error));
        resolve(response.models);
      }
    );
  });
}

async function refreshProviderModels(providerId, force = false) {
  if (!canRefreshProvider(providerId)) {
    setProviderStatus(
      providerId,
      PROVIDERS[providerId].apiKeyOptional ? t('setUrlRefresh', lang) : t('setKeyRefresh', lang)
    );
    return;
  }

  const btn = providerEls[providerId].refresh;
  btn.disabled = true;
  setProviderStatus(providerId, t('loadingModels', lang));

  try {
    const models = await fetchModelsFromBg(providerId, getProviderConfig(providerId), force);
    fillModelSelect(providerId, models, providerEls[providerId].model.value);
    if (providerId === 'ollama' && !models.length) {
      setProviderStatus(providerId, t('ollamaManualModel', lang));
    } else {
      setProviderStatus(providerId, t('activeModels', lang, { n: models.length }), 'ok');
    }
  } catch (err) {
    if (providerId === 'ollama') {
      const manual = providerEls.ollama.model.value.trim();
      setProviderStatus(
        providerId,
        manual ? `${err.message} — ${t('ollamaManualModel', lang)}` : err.message,
        manual ? '' : 'error'
      );
      return;
    }
    const cached = await getCachedModels(providerId);
    if (cached?.length) {
      fillModelSelect(providerId, cached, providerEls[providerId].model.value);
      setProviderStatus(providerId, t('cachedModels', lang, { n: cached.length, error: err.message }), 'error');
    } else {
      setProviderStatus(providerId, err.message, 'error');
    }
  } finally {
    btn.disabled = false;
  }
}

async function loadSettings() {
  const settings = await getSettings();
  lang = settings.uiLanguage ?? 'en';
  populateUiLanguages(lang);
  applyOptionsI18n();
  buildProviderSections();

  populateLanguages(settings.defaultLanguage);
  populateProviders(settings.activeProvider);
  batchSize.value = String(settings.batchSize);
  parallelRequests.value = String(settings.parallelRequests ?? 20);
  skipDomains.value = settings.skipDomains.join('\n');
  translationCacheEnabled.checked = settings.translationCacheEnabled !== false;
  selectionTtsEnabled.checked = settings.selectionTtsEnabled !== false;
  selectionTtsEngine.value = settings.selectionTtsEngine === 'openai' ? 'openai' : 'browser';
  populateTtsVoices(settings.selectionTtsVoice ?? 'nova');
  populateTtsModels(settings.selectionTtsModel ?? 'tts-1');
  updateTtsOpenAiFieldsVisibility();
  const speech = settings.speech ?? {};
  populateSpeechEngines(speech.engine ?? 'browser');
  speechGoogleKey.value = speech.googleKey ?? '';
  speechGoogleVoice.value = speech.googleVoice ?? 'en-US-Standard-A';
  speechGeminiModel.value = speech.geminiModel ?? 'gemini-2.5-flash-preview-tts';
  speechElevenlabsKey.value = speech.elevenlabsKey ?? '';
  speechElevenlabsVoiceId.value = speech.elevenlabsVoiceId ?? '';
  speechRate.value = String(speech.rate ?? 1);
  speechPitch.value = String(speech.pitch ?? 1);
  populateSpeechVoices(speech.voice ?? '');
  updateSpeechFields();
  setThemeSegmentButtons(settings.translatorTheme ?? 'system');
  await refreshCacheCount();
  for (const [id, config] of Object.entries(settings.providers)) {
    if (!providerEls[id]) continue;
    if (providerEls[id].key) providerEls[id].key.value = config.apiKey ?? '';
    updateKeyLink(id);
    if (providerEls[id].baseUrl) {
      providerEls[id].baseUrl.value = config.baseUrl ?? PROVIDERS[id].defaultBaseUrl ?? '';
    }
    if (!PROVIDERS[id].noModel) fillModelSelect(id, null, config.model);
    if (id === 'ollama') {
      providerEls.ollama.temperature.value = config.temperature ?? '';
      providerEls.ollama.numCtx.value = config.numCtx ?? '';
      providerEls.ollama.keepAlive.value = config.keepAlive ?? '';
      providerEls.ollama.timeout.value = config.timeout ?? '';
    }
  }

  await Promise.all(
    Object.keys(PROVIDERS).map(async (id) => {
      if (!canRefreshProvider(id)) return;
      const cached = await getCachedModels(id);
      if (cached?.length) {
        fillModelSelect(id, cached, settings.providers[id]?.model);
        setProviderStatus(id, t('activeModels', lang, { n: cached.length }) + ' (cache)', 'ok');
      }
      refreshProviderModels(id, false);
    })
  );
}

async function ensureHostPermission(baseUrl) {
  if (!baseUrl || /localhost|127\.0\.0\.1/.test(baseUrl)) return true;
  const origin = new URL(baseUrl).origin;
  const pattern = `${origin}/*`;
  if (await browser.permissions.contains({ origins: [pattern] })) return true;
  try {
    return await browser.permissions.request({ origins: [pattern] });
  } catch {
    // Firefox < 128 has no optional_host_permissions: treat as denied.
    return false;
  }
}

function collectSettings() {
  const providers = {};
  for (const id of Object.keys(PROVIDERS)) {
    providers[id] = getProviderConfig(id);
  }
  return {
    uiLanguage: uiLanguage.value,
    defaultLanguage: defaultLanguage.value,
    activeProvider: activeProvider.value,
    batchSize: Math.min(150, Math.max(40, Number(batchSize.value) || 120)),
    parallelRequests: Math.min(20, Math.max(1, Number(parallelRequests.value) || 20)),
    skipDomains: skipDomains.value.split('\n').map((d) => d.trim()).filter(Boolean),
    translationCacheEnabled: translationCacheEnabled.checked,
    translatorTheme: selectedTranslatorTheme,
    selectionTtsEnabled: selectionTtsEnabled.checked,
    selectionTtsEngine: selectionTtsEngine.value === 'openai' ? 'openai' : 'browser',
    selectionTtsVoice: selectionTtsVoice.value,
    selectionTtsModel: selectionTtsModel.value,
    speech: collectSpeech(),
    providers,
  };
}

async function saveAllSettings() {  const settings = collectSettings();
  const ollama = settings.providers.ollama;

  if (settings.activeProvider === 'ollama') {
    if (!ollama?.baseUrl?.trim()) {
      throw new Error(t('ollamaUrlRequired', lang));
    }
    if (!ollama?.model?.trim()) {
      throw new Error(t('ollamaModelRequired', lang));
    }
    if (!validateOllamaBaseUrl(ollama.baseUrl)) {
      throw new Error(t('invalidOllamaUrl', lang));
    }
    if (!(await ensureHostPermission(ollama.baseUrl))) {
      throw new Error(t('ollamaPermissionDenied', lang));
    }
  } else if (ollama?.baseUrl?.trim() && !validateOllamaBaseUrl(ollama.baseUrl)) {
    throw new Error(t('invalidOllamaUrl', lang));
  }

  const free = settings.providers.free;
  if (free?.baseUrl?.trim() && !/translate\.googleapis\.com/.test(free.baseUrl)) {
    if (!validateOllamaBaseUrl(free.baseUrl)) {
      throw new Error(t('invalidFreeUrl', lang));
    }
    if (!(await ensureHostPermission(free.baseUrl))) {
      throw new Error(t('freePermissionDenied', lang));
    }
  }

  await saveSettings(settings);
  lang = settings.uiLanguage;
  applyOptionsI18n();
}

refreshAllBtn.addEventListener('click', async () => {
  refreshAllBtn.disabled = true;
  refreshStatus.textContent = t('refreshing', lang);
  await Promise.all(
    Object.keys(PROVIDERS).map((id) => {
      if (canRefreshProvider(id)) return refreshProviderModels(id, true);
    })
  );
  refreshStatus.textContent = t('refreshDone', lang);
  refreshAllBtn.disabled = false;
  setTimeout(() => { refreshStatus.textContent = ''; }, 2500);
});

clearCacheBtn.addEventListener('click', async () => {
  clearCacheBtn.disabled = true;
  try {
    await clearTranslationCache();
    clearCacheStatus.textContent = t('cacheCleared', lang);
    await refreshCacheCount();
  } catch (err) {
    clearCacheStatus.textContent = err.message;
  } finally {
    clearCacheBtn.disabled = false;
    setTimeout(() => { clearCacheStatus.textContent = ''; }, 2500);
  }
});

selectionTtsEngine.addEventListener('change', updateTtsOpenAiFieldsVisibility);
speechEngine.addEventListener('change', updateSpeechFields);
defaultLanguage.addEventListener('change', () => populateSpeechVoices(speechVoice.value));
speechTestBtn.addEventListener('click', testSpeech);
window.speechSynthesis?.addEventListener('voiceschanged', () => populateSpeechVoices(speechVoice.value));

themeSegmentButtons.forEach((btn) => {
  btn.addEventListener('click', () => setThemeSegmentButtons(btn.dataset.theme));
});

saveBtn.addEventListener('click', async () => {
  try {    await saveAllSettings();
    saveStatus.textContent = t('saved', lang);
  } catch (err) {
    saveStatus.textContent = err.message;
    saveStatus.className = 'save-status error';
  }
  setTimeout(() => {
    saveStatus.textContent = '';
    saveStatus.className = 'save-status';
  }, 3500);
});

uiLanguage.addEventListener('change', async () => {
  const s = await getSettings();
  s.uiLanguage = uiLanguage.value;
  await saveSettings(s);
  await loadSettings();
});

function openPrivacyPolicy() {
  browser.tabs.create({ url: browser.runtime.getURL('privacy/privacy.html') });
}

document.getElementById('privacyPolicyLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  openPrivacyPolicy();
});

document.getElementById('footerPrivacyLink')?.addEventListener('click', (e) => {
  e.preventDefault();
  openPrivacyPolicy();
});

privacyConsent.addEventListener('change', () => {
  acceptPrivacyBtn.disabled = !privacyConsent.checked;
});

acceptPrivacyBtn.addEventListener('click', async () => {
  await setPrivacyConsent(true);
  privacyCard.classList.add('hidden');
  settingsContent.classList.remove('hidden');
  await loadSettings();
});

async function init() {
  const consented = await hasPrivacyConsent();
  if (consented) {
    privacyCard.classList.add('hidden');
    settingsContent.classList.remove('hidden');
    await loadSettings();
  } else {
    const settings = await getSettings();
    lang = settings.uiLanguage ?? 'en';
    populateUiLanguages(lang);
    applyOptionsI18n();
    privacyCard.classList.remove('hidden');
    settingsContent.classList.add('hidden');
  }
}

init();
