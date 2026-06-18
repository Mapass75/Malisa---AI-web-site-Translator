import { LANGUAGES, PROVIDERS } from './types.js';

const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));
const PROVIDER_IDS = new Set(Object.keys(PROVIDERS));

const MAX_BLOCKS = 1200;
const MAX_TEXT_LENGTH = 12000;
const MAX_BATCHES = 50;

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isValidLanguage(code) {
  return typeof code === 'string' && LANGUAGE_CODES.has(code);
}

export function isValidProvider(id) {
  return typeof id === 'string' && PROVIDER_IDS.has(id);
}

export function validateBlocks(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error('No text to translate on this page');
  }

  const limited = blocks.length > MAX_BLOCKS ? blocks.slice(0, MAX_BLOCKS) : blocks;

  return limited.map((block, index) => {
    if (!block || typeof block.text !== 'string') {
      throw new Error('Invalid text block format');
    }
    const text = block.text.trim().slice(0, MAX_TEXT_LENGTH);
    if (!text) {
      throw new Error('Empty text block');
    }
    return { id: String(block.id ?? index), text };
  });
}

export function assertTrustedSender(sender) {
  if (!sender) throw new Error('Unauthorized message source');
  if (sender.id && sender.id !== chrome.runtime.id) {
    throw new Error('Unauthorized message source');
  }
}

export function validateOllamaBaseUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (parsed.username || parsed.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function sanitizeErrorMessage(message) {
  if (!message) return 'Unknown error';
  return String(message)
    .replace(/sk-[A-Za-z0-9_-]+/g, '[API_KEY]')
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[API_KEY]')
    .replace(/gsk_[A-Za-z0-9_-]+/g, '[API_KEY]')
    .replace(/AIza[A-Za-z0-9_-]+/g, '[API_KEY]')
    .slice(0, 300);
}

/** fetch() header values must be ISO-8859-1 (ByteString). */
export function sanitizeHeaderValue(value) {
  if (value == null) return '';
  return String(value)
    .replace(/^\uFEFF/, '')
    .replace(/[\u2018\u2019\u201C\u201D\u00A0]/g, (ch) => (ch === '\u00A0' ? ' ' : "'"))
    .replace(/[^\x00-\xFF]/g, '')
    .trim();
}

export function sanitizeApiKey(apiKey) {
  return sanitizeHeaderValue(apiKey);
}

export function buildAuthHeaders(apiKey, extra = {}) {
  const headers = {};
  for (const [key, value] of Object.entries(extra)) {
    headers[key] = sanitizeHeaderValue(value);
  }
  const cleanKey = sanitizeApiKey(apiKey);
  if (cleanKey) headers.Authorization = `Bearer ${cleanKey}`;
  return headers;
}

export { MAX_BATCHES };
