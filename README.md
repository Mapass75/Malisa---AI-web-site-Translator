# Malisa — AI web site Translator

Malisa is a free, open-source browser extension (Chrome, Edge, Firefox) that translates web pages and typed text using the AI or translation provider you choose. Bring your own API key, or use a free option with no key. Keys stay on your device.

## Features

### Translation
- Translate page / Restore original
- "Translate text" box in the popup: source language (auto-detect) + target language, swap button, Copy button
- Default target language is English on first install
- Selection translate: right-click highlighted text → floating popup
- Batched requests, deduplication and a local cache to save tokens

### Listen
- Play, pause and stop for the original and translated text in the text box, and read-aloud on translated selection
- Browser voices by default (voice, speed, pitch); optional Google Cloud TTS, Gemini TTS, ElevenLabs, OpenAI TTS, Microsoft Azure Speech, Amazon Polly, or a custom self-hosted OpenAI-compatible endpoint (e.g. Kokoro). Free-tier quotas can change.

### Providers
- OpenAI, Anthropic (Claude), Google Gemini, Grok (xAI), DeepSeek, Mistral, Groq, OpenRouter — one shared OpenAI-compatible client where applicable
- Free translate — MyMemory, no API key needed
- Ollama — local models, including Hugging Face GGUF models
- "No API key? Get one here" links under each key field, and "Free tier" badges next to providers with free plans

### Interface
- Light, dark and system themes
- Settings page: "Providers, models & performance"
- 7 interface languages (en, hr, sr, de, it, fr, es)

## Install

### Chrome / Edge
- Chrome Web Store: _link TBD_
- Or load unpacked: `chrome://extensions` → Developer mode → Load unpacked → select `chrome/` (or unzip `release/chrome/malisa-chrome-2.5.0.zip`)

### Firefox
`about:debugging` → This Firefox → Load Temporary Add-on → select `dist/firefox/manifest.json` or `release/firefox/malisa-firefox-2.5.0.xpi`

## Build

```bash
npm install
npm run build:chrome    # → dist/chrome/ + release/chrome/*.zip
npm run build:firefox   # → dist/firefox/ + release/firefox/*.xpi
npx web-ext lint --source-dir dist/firefox
```

## Setup

1. Open Settings (right-click the Malisa icon → Options).
2. Add an API key for your provider — or pick Free translate / Ollama (no key).
3. Click the Malisa icon on any page and choose Translate page.

## Free options

- **MyMemory** — no key; about 5,000 chars/day, 50,000/day with an email address
- **Groq**, **Gemini**, **OpenRouter** (models ending in `:free`), **Mistral** — free tiers with your own key
- **Ollama** — runs locally, free

Limits can change; the date they were last checked is shown in each free-tier tooltip.

## Using Ollama

```bash
ollama pull gemma3:4b                     # or any model
ollama run hf.co/<user>/<repo>            # Hugging Face models (GGUF only)
```

In Settings → Ollama: set the base URL (`http://localhost:11434`), type any model name or click Refresh models to load installed ones, then Test connection.

If requests are blocked by CORS, allow the extension origin and restart Ollama:

```bash
OLLAMA_ORIGINS=chrome-extension://*,moz-extension://* ollama serve
```

## Privacy

API keys are stored only in the extension's local storage and are never logged. Text is sent only to the provider you choose — for translation and, when using cloud speech, to the chosen speech provider. Some providers' free tiers (Gemini, OpenRouter) may use content to improve their services. See [PRIVACY.md](PRIVACY.md).

## Troubleshooting

- **"Refresh the page and try again"** — the extension injects its content script automatically; if it persists, reload the page once.
- **No voice for the language** — Malisa falls back to your system's default voice; you can also pick a cloud TTS provider in Settings → Speech.
- **Rate limit / 429** — retry in a moment; free providers have daily quotas (see "Free options").

## License

See [LICENSE](LICENSE).
