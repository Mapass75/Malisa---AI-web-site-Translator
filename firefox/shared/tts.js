import { sanitizeApiKey } from './security.js';

const LANG_BCP47 = {
  hr: 'hr-HR',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  cs: 'cs-CZ',
  sk: 'sk-SK',
  sl: 'sl-SI',
  sr: 'sr-RS',
  bs: 'bs-BA',
  ru: 'ru-RU',
  uk: 'uk-UA',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  ar: 'ar-SA',
  tr: 'tr-TR',
  sv: 'sv-SE',
  da: 'da-DK',
  no: 'nb-NO',
  fi: 'fi-FI',
  hu: 'hu-HU',
  ro: 'ro-RO',
  bg: 'bg-BG',
  el: 'el-GR',
  he: 'he-IL',
  hi: 'hi-IN',
  th: 'th-TH',
  vi: 'vi-VN',
  id: 'id-ID',
};

export const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
export const OPENAI_TTS_MODELS = ['tts-1', 'tts-1-hd'];

export function langToBcp47(code) {
  if (!code || typeof code !== 'string') return '';
  const base = code.split('-')[0].toLowerCase();
  return LANG_BCP47[base] ?? '';
}

export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function fetchOpenAiSpeech({ text, apiKey, voice = 'nova', model = 'tts-1' }) {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) throw new Error('OpenAI API key is not configured');

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: text.slice(0, 4096),
      voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    let detail = `OpenAI TTS failed (${response.status})`;
    try {
      const err = await response.json();
      if (err?.error?.message) detail = err.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const buffer = await response.arrayBuffer();
  return {
    audioBase64: arrayBufferToBase64(buffer),
    mimeType: 'audio/mpeg',
  };
}
