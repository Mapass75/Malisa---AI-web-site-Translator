export function getProviderLimits(providerId, settings) {
  const meta = PROVIDERS[providerId] ?? {};
  const parallel = Math.min(
    settings.parallelRequests ?? meta.parallel ?? 12,
    meta.maxParallel ?? 20
  );
  return {
    batchSize: settings.batchSize ?? meta.batchSize ?? 120,
    maxChars: settings.maxCharsPerBatch ?? meta.maxChars ?? 48000,
    parallel: Math.max(1, parallel),
  };
}

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    keyPlaceholder: 'sk-...',
    defaultModel: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    type: 'openai',
    parallel: 20,
    maxParallel: 20,
    maxChars: 48000,
    batchSize: 120,
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    keyPlaceholder: 'sk-ant-...',
    defaultModel: 'claude-haiku-4-5',
    type: 'anthropic',
    parallel: 12,
    maxParallel: 12,
    maxChars: 40000,
    batchSize: 100,
  },
  google: {
    label: 'Google (Gemini)',
    keyPlaceholder: 'AIza...',
    defaultModel: 'gemini-2.0-flash',
    type: 'google',
    parallel: 20,
    maxParallel: 20,
    maxChars: 48000,
    batchSize: 120,
  },
  deepseek: {
    label: 'DeepSeek',
    keyPlaceholder: 'sk-...',
    defaultModel: 'deepseek-chat',
    baseUrl: 'https://api.deepseek.com',
    type: 'openai',
    parallel: 16,
    maxParallel: 16,
    maxChars: 48000,
    batchSize: 120,
  },
  groq: {
    label: 'Groq',
    keyPlaceholder: 'gsk_...',
    defaultModel: 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
    type: 'openai',
    parallel: 20,
    maxParallel: 20,
    maxChars: 40000,
    batchSize: 100,
  },
  mistral: {
    label: 'Mistral',
    keyPlaceholder: '...',
    defaultModel: 'mistral-small-latest',
    baseUrl: 'https://api.mistral.ai/v1',
    type: 'openai',
    parallel: 14,
    maxParallel: 14,
    maxChars: 40000,
    batchSize: 100,
  },
  openrouter: {
    label: 'OpenRouter',
    keyPlaceholder: 'sk-or-...',
    defaultModel: 'google/gemini-2.0-flash-001',
    baseUrl: 'https://openrouter.ai/api/v1',
    type: 'openai',
    parallel: 14,
    maxParallel: 14,
    maxChars: 40000,
    batchSize: 100,
  },
  grok: {
    label: 'Grok (xAI)',
    keyPlaceholder: 'xai-...',
    defaultModel: 'grok-4-fast-non-reasoning',
    baseUrl: 'https://api.x.ai/v1',
    type: 'openai',
    parallel: 14,
    maxParallel: 14,
    maxChars: 40000,
    batchSize: 100,
  },
  free: {
    label: 'Free translate (no key)',
    defaultBaseUrl: 'https://api.mymemory.translated.net/get',
    type: 'mymemory',
    apiKeyOptional: true,
    noApiKey: true,
    noModel: true,
    parallel: 2,
    maxParallel: 4,
    maxChars: 1500,
    batchSize: 25,
  },
  ollama: {
    label: 'Ollama (local)',
    keyPlaceholder: 'optional',
    defaultModel: '',
    defaultBaseUrl: 'http://localhost:11434/v1',
    type: 'ollama',
    apiKeyOptional: true,
    parallel: 3,
    maxParallel: 4,
    maxChars: 16000,
    batchSize: 60,
  },
};

// Helper links shown under the API key field in Settings.
export const PROVIDER_KEY_URLS = {
  openai: 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
  google: 'https://aistudio.google.com/apikey',
  grok: 'https://console.x.ai',
  deepseek: 'https://platform.deepseek.com/api_keys',
  openrouter: 'https://openrouter.ai/keys',
  groq: 'https://console.groq.com/keys',
  mistral: 'https://console.mistral.ai/api-keys',
};

export const OLLAMA_DOWNLOAD_URL = 'https://ollama.com/download';

// Free-tier notes shown as a "Free tier" badge. Values may change —
// `checked` is the date they were last verified.
export const FREE_TIER_INFO = {
  groq: 'Free, no card. openai/gpt-oss-120b: 30 requests/min, 1,000/day, 8K tokens/min, 200K tokens/day.',
  google:
    'Free tier on several models, no card. Limits are shown in AI Studio. Free-tier content may be used by Google to improve its products, so avoid sensitive text.',
  openrouter:
    'Models with IDs ending in :free cost nothing. 20 requests/min, 50/day; 1,000/day after a one-time purchase of 10 credits. Pick a model ending in ":free".',
  mistral: 'Free mode, no card. Limits are shown in your Mistral admin panel.',
  free: 'No key. MyMemory: about 5,000 characters/day, 50,000/day if you enter an email.',
  ollama: 'Free, runs on your computer.',
};
export const FREE_TIER_CHECKED = '2026-11-04';

// Text-to-speech engines. 'openai' is kept for the selection-reader feature.
export const SPEECH_ENGINES = {
  browser: { label: 'Browser voices', freeInfo: 'Free, built into your browser.' },
  google: {
    label: 'Google Cloud TTS',
    keyUrl: 'https://console.cloud.google.com/apis/library/texttospeech.googleapis.com',
    freeInfo: 'Needs billing enabled; free monthly quota (about 4M characters for Standard voices).',
  },
  gemini: {
    label: 'Gemini TTS',
    freeInfo:
      'Uses the Gemini API key. Free-tier content may be used by Google to improve its products, so avoid sensitive text.',
  },
  elevenlabs: {
    label: 'ElevenLabs',
    keyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    freeInfo: 'Free up to about 10,000 characters/month, attribution required, no commercial license.',
  },
};

export const DEFAULT_SETTINGS = {
  defaultLanguage: 'en',
  uiLanguage: 'en',
  activeProvider: 'openai',
  providers: Object.fromEntries(
    Object.entries(PROVIDERS).map(([id, p]) => [
      id,
      {
        apiKey: '',
        model: p.defaultModel,
        ...(p.defaultBaseUrl ? { baseUrl: p.defaultBaseUrl } : {}),
      },
    ])
  ),
  batchSize: 120,
  parallelRequests: 20,
  maxCharsPerBatch: 48000,
  skipDomains: [],
  translationCacheEnabled: true,
  translatorTheme: 'system',
  selectionTtsEnabled: true,
  selectionTtsEngine: 'browser',
  selectionTtsVoice: 'nova',
  selectionTtsModel: 'tts-1',
  speech: {
    engine: 'browser',
    voice: '',
    rate: 1,
    pitch: 1,
    googleKey: '',
    googleVoice: 'en-US-Standard-A',
    geminiModel: 'gemini-2.5-flash-preview-tts',
    elevenlabsKey: '',
    elevenlabsVoiceId: '',
  },
};

export const LANGUAGES = [
  { code: 'hr', name: 'Hrvatski' },
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'pl', name: 'Polski' },
  { code: 'cs', name: 'Čeština' },
  { code: 'sk', name: 'Slovenčina' },
  { code: 'sl', name: 'Slovenščina' },
  { code: 'sr', name: 'Srpski' },
  { code: 'bs', name: 'Bosanski' },
  { code: 'ru', name: 'Русский' },
  { code: 'uk', name: 'Українська' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'sv', name: 'Svenska' },
  { code: 'da', name: 'Dansk' },
  { code: 'no', name: 'Norsk' },
  { code: 'fi', name: 'Suomi' },
  { code: 'hu', name: 'Magyar' },
  { code: 'ro', name: 'Română' },
  { code: 'bg', name: 'Български' },
  { code: 'el', name: 'Ελληνικά' },
  { code: 'he', name: 'עברית' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'th', name: 'ไทย' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'id', name: 'Bahasa Indonesia' },
];

export const PROVIDER_LABELS = Object.fromEntries(
  Object.entries(PROVIDERS).map(([id, p]) => [id, p.label])
);

export function isProviderReady(providerId, config) {
  const meta = PROVIDERS[providerId];
  if (!meta || !config) return false;
  if (!meta.noModel && !config.model) return false;
  if (meta.apiKeyOptional) return !!config.baseUrl;
  return !!config.apiKey;
}
