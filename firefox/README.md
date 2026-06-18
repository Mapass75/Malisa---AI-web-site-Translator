# Malisa — Firefox Extension

Translate any web page using **your own AI API keys** (BYOK).

**Browser:** Mozilla Firefox 128+

**Providers:** OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Groq, Mistral, OpenRouter, Ollama (local).

## Install (development)

1. Clone this repository.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select `manifest.json` in this folder.
4. Open **Settings**, accept the privacy policy, and add your API keys.

## Usage

1. Open any `http`/`https` page.
2. Click the Malisa icon.
3. Choose target language and provider, then **Translate page**.
4. Use **Restore original** to revert.

## Interface language

English by default. Change **Interface language** in Settings (Croatian available).

## Build store package (.xpi)

```bash
npm install
npm run icons
npm run package
```

Output: `../malisa-firefox-webstore/release/malisa-firefox-2.0.0.xpi`

Store listing docs: [malisa-firefox-webstore](../malisa-firefox-webstore/README.md)

## Firefox-specific notes

- Extension ID: `malisa-ai-translator@malisa.app` (required for AMO).
- Uses `options_ui` and background `scripts` per Firefox MV3 conventions.
- `chrome.*` APIs are supported via Firefox WebExtensions compatibility layer.

## License

MIT — see [LICENSE](LICENSE).
