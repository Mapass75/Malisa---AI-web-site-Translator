import browser from './browser.js';
import { DEFAULT_SETTINGS, LANGUAGES } from './types.js';

const STORAGE_KEY = 'settings';
const CONSENT_KEY = 'privacy_consent_v1';

async function migrateFromSyncIfNeeded() {
  const local = await browser.storage.local.get(STORAGE_KEY);
  if (local[STORAGE_KEY]) return;

  const sync = await browser.storage.sync.get(STORAGE_KEY);
  if (!sync[STORAGE_KEY]) return;

  await browser.storage.local.set({ [STORAGE_KEY]: sync[STORAGE_KEY] });
  await browser.storage.sync.remove(STORAGE_KEY);
}

export async function getSettings() {
  await migrateFromSyncIfNeeded();
  const result = await browser.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY];
  if (!stored) return structuredClone(DEFAULT_SETTINGS);

  const providers = { ...DEFAULT_SETTINGS.providers };
  for (const [id, defaults] of Object.entries(DEFAULT_SETTINGS.providers)) {
    providers[id] = { ...defaults, ...stored.providers?.[id] };
  }

  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    parallelRequests: stored.parallelRequests ?? DEFAULT_SETTINGS.parallelRequests,
    maxCharsPerBatch: stored.maxCharsPerBatch ?? DEFAULT_SETTINGS.maxCharsPerBatch,
    uiLanguage: stored.uiLanguage ?? DEFAULT_SETTINGS.uiLanguage,
    translationCacheEnabled:
      stored.translationCacheEnabled ?? DEFAULT_SETTINGS.translationCacheEnabled,
    translatorTheme: stored.translatorTheme ?? DEFAULT_SETTINGS.translatorTheme,
    selectionTtsEnabled: stored.selectionTtsEnabled ?? DEFAULT_SETTINGS.selectionTtsEnabled,
    speech: migrateSpeech(stored),
    speechMigrated: true,
    providers,
  };
}

// Older versions had a separate selection-popup engine (browser | openai).
// Fold it into the single speech config once, keeping the user's choice.
function migrateSpeech(stored) {
  const speech = { ...DEFAULT_SETTINGS.speech, ...(stored.speech ?? {}) };
  if (stored.speechMigrated || stored.selectionTtsEngine !== 'openai') return speech;
  if ((stored.speech?.engine ?? 'browser') !== 'browser') return speech;
  speech.engine = 'openai';
  if (!stored.speech?.openaiVoice && stored.selectionTtsVoice) speech.openaiVoice = stored.selectionTtsVoice;
  if (!stored.speech?.openaiModel && stored.selectionTtsModel) speech.openaiModel = stored.selectionTtsModel;
  return speech;
}

export async function saveSettings(settings) {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

export async function hasPrivacyConsent() {
  const result = await browser.storage.local.get(CONSENT_KEY);
  return result[CONSENT_KEY] === true;
}

export async function setPrivacyConsent(accepted) {
  await browser.storage.local.set({ [CONSENT_KEY]: !!accepted });
}

export function getLanguageName(code) {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
