# Malisa — Chrome Extension

Translate any web page using **your own AI API keys** (BYOK).

**Browser:** Google Chrome 109+

**Providers:** OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Groq, Mistral, OpenRouter, Ollama (local).

## Install (development)

1. Clone this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this folder (`malisa-chrome`).
5. Open **Settings**, accept the privacy policy, and add your API keys.

## Usage

1. Open any `http`/`https` page.
2. Click the Malisa icon.
3. Choose target language and provider, then **Translate page**.
4. Use **Restore original** to revert.

## Interface language

English by default. Change **Interface language** in Settings (Croatian available).

## Build store package

```bash
npm install
npm run icons
npm run package
```

Output: `../malisa-chrome-webstore/release/malisa-chrome-2.0.0.zip`

Store listing docs: [malisa-chrome-webstore](../malisa-chrome-webstore/README.md)

## Project structure

```
manifest.json
background/     — service worker, API calls
content/        — page text extraction & replacement
popup/          — quick translate UI
options/        — settings & providers
shared/         — storage, cache, i18n, providers
icons/          — extension icons (chip, brain, AI design)
privacy/        — privacy policy HTML
scripts/        — icons & packaging
```

## License

MIT — see [LICENSE](LICENSE).
