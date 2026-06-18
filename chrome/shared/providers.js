import { getLanguageName } from './storage.js';
import { PROVIDERS } from './types.js';
import { buildAuthHeaders, sanitizeApiKey, sanitizeHeaderValue } from './security.js';
const langCache = new Map();

function targetLabel(code) {
  if (!langCache.has(code)) {
    langCache.set(code, `${getLanguageName(code)} (${code})`);
  }
  return langCache.get(code);
}

function buildPrompt(blocks, targetLanguage) {
  const lang = targetLabel(targetLanguage);
  const lines = blocks.map((b) => `${b.id}|${b.text}`).join('\n');
  return `Translate each line to ${lang}. Web page UI text (buttons, labels, menus, product names where appropriate). Return one translation per id.\nJSON only: {"translations":[{"id":"0","t":"..."}]}\n${lines}`;
}

const SYSTEM =
  'Professional website translator. Return only valid JSON: {"translations":[{"id":"...","t":"..."}]}. ' +
  'Translate every line including short ALL CAPS labels. Keep brand names, URLs, SKUs and pure numbers unchanged. ' +
  'Use natural phrasing for the target language. Match formal/informal tone of the source.';

function getTranslatedValue(item) {
  if (!item || typeof item !== 'object') return '';
  return (
    item.t ??
    item.translated ??
    item.translation ??
    item.content ??
    item.value ??
    item.target ??
    ''
  );
}

function collectTranslationsFromParsed(parsed, blocks, byId) {
  const translations = Array.isArray(parsed)
    ? parsed
    : parsed.translations ?? parsed.results ?? parsed.data ?? [];

  for (const item of translations) {
    if (!item || typeof item !== 'object') continue;
    if (item.id === undefined || item.id === null) continue;
    const value = getTranslatedValue(item).trim();
    if (value) byId.set(String(item.id), value);
  }

  if (!byId.size && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    for (const block of blocks) {
      const raw = parsed[block.id] ?? parsed[Number(block.id)];
      if (typeof raw === 'string' && raw.trim()) {
        byId.set(String(block.id), raw.trim());
      } else if (raw && typeof raw === 'object') {
        const value = getTranslatedValue(raw).trim();
        if (value) byId.set(String(block.id), value);
      }
    }
  }
}

function parseTranslationResponse(content, blocks, targetLanguage) {
  const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI response is not valid JSON');
  }

  const translations = Array.isArray(parsed) ? parsed : parsed.translations ?? [];
  const byId = new Map();
  collectTranslationsFromParsed(parsed, blocks, byId);

  const results = blocks.map((block, index) => {
    let translated = byId.get(String(block.id));

    if (!translated && translations[index]) {
      translated = getTranslatedValue(translations[index]).trim();
    }

    if (!translated) {
      translated = block.text;
    }

    return { id: block.id, translated, source: block.text };
  });

  const changed = results.filter((r) => r.translated !== r.source).length;
  const matchedById = blocks.filter((block) => byId.has(String(block.id))).length;

  if (blocks.length >= 3 && changed === 0) {
    if (matchedById === 0 && translations.length > 0) {
      throw new Error('AI response format mismatch. Try a smaller batch or another model.');
    }
    if (matchedById > 0) {
      return results.map(({ id, translated }) => ({ id, translated }));
    }
    const lang = targetLabel(targetLanguage);
    throw new Error(
      `No text was translated. The page may already be in ${lang}, or try a smaller batch / another model.`
    );
  }

  return results.map(({ id, translated }) => ({ id, translated }));
}

function estimateMaxTokens(blocks) {
  const chars = blocks.reduce((s, b) => s + b.text.length, 0);
  return Math.min(16384, Math.max(1024, Math.ceil(chars * 1.6) + 256));
}

async function translateWithOllama(opts) {
  const baseUrl = ollamaOpenAiBase(opts.baseUrl || 'http://localhost:11434/v1');
  const headers = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(opts.apiKey),
  };
  const model = sanitizeHeaderValue(opts.model);
  const payload = {
    model,    temperature: 0,
    stream: false,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: buildPrompt(opts.blocks, opts.targetLanguage) },
    ],
  };

  const post = (withJsonFormat) =>
    fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(withJsonFormat ? { ...payload, format: 'json' } : payload),
    });

  let response = await post(true);
  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 400 && /format|json/i.test(errText)) {
      response = await post(false);
      if (!response.ok) throw new Error(`Ollama ${response.status}: ${await response.text()}`);
    } else {
      throw new Error(`Ollama ${response.status}: ${errText}`);
    }
  }

  const data = await response.json();
  return parseTranslationResponse(data.choices?.[0]?.message?.content ?? '{}', opts.blocks, opts.targetLanguage);
}

function ollamaOpenAiBase(baseUrl) {
  const trimmed = (baseUrl || 'http://localhost:11434/v1').replace(/\/$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

async function translateOpenAICompatible(baseUrl, apiKey, model, blocks, targetLanguage, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(apiKey, extraHeaders),
  };
  const safeModel = sanitizeHeaderValue(model);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: safeModel,
      temperature: 0,
      max_tokens: estimateMaxTokens(blocks),
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: buildPrompt(blocks, targetLanguage) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
  const data = await response.json();
  return parseTranslationResponse(data.choices?.[0]?.message?.content ?? '{}', blocks, targetLanguage);
}

async function translateWithAnthropic(opts) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': sanitizeApiKey(opts.apiKey),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },    body: JSON.stringify({
      model: opts.model,
      max_tokens: estimateMaxTokens(opts.blocks),
      temperature: 0,
      messages: [{ role: 'user', content: buildPrompt(opts.blocks, opts.targetLanguage) }],
      system: SYSTEM,
    }),
  });
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return parseTranslationResponse(data.content?.[0]?.text ?? '{}', opts.blocks, opts.targetLanguage);
}

async function translateWithGoogle(opts) {
  const modelId = sanitizeHeaderValue(opts.model).replace(/^models\//, '');
  const apiKey = encodeURIComponent(sanitizeApiKey(opts.apiKey));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(opts.blocks, opts.targetLanguage) }] }],
      systemInstruction: { parts: [{ text: SYSTEM }] },
      generationConfig: {
        temperature: 0,
        maxOutputTokens: estimateMaxTokens(opts.blocks),
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!response.ok) throw new Error(`Google ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return parseTranslationResponse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}', opts.blocks, opts.targetLanguage);
}

export async function translate(provider, opts) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  if (config.type === 'anthropic') return translateWithAnthropic(opts);
  if (config.type === 'google') return translateWithGoogle(opts);
  if (config.type === 'ollama') return translateWithOllama(opts);

  const extraHeaders =
    provider === 'openrouter'
      ? { 'HTTP-Referer': 'https://malisa-translator.extension', 'X-Title': 'Malisa Translator' }
      : {};

  return translateOpenAICompatible(
    config.baseUrl,
    opts.apiKey,
    opts.model,
    opts.blocks,
    opts.targetLanguage,
    extraHeaders
  );
}
