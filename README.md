# Malisa — AI web site Translator

Translate any web page with **your own AI API keys**. Chrome and Firefox extensions (Manifest V3).

**Version:** 2.4.0

## Features

- BYOK — OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Grok (xAI), Mistral, OpenRouter, Ollama
- **Free translate** — no API key needed (LibreTranslate-compatible endpoint, configurable URL)
- Full-page translation + restore original
- **Translate text** — Google-Translate-style box in the popup
- **Selection translate** — right-click highlighted text → floating popup with translation
- **Text-to-speech** in selection popup (browser or OpenAI TTS)
- Fast parallel translation with deduplication and local cache (SHA-256 keys)
- Light / dark / system UI theme
- Translation cache controls (on/off, clear)
- API key show/hide, clear, and connection test
- 7 interface languages (en, hr, sr, de, it, fr, es)

## Repository layout

| Folder | Purpose |
|--------|---------|
| `chrome/` | Single extension source for both browsers — load unpacked in `chrome://extensions` |
| `dist/chrome/` | Built Chrome extension (`npm run build`) |
| `dist/firefox/` | Built Firefox extension (`npm run build`) — gecko manifest + bundled background |
| `release/chrome/` | Chrome Web Store ZIP (`malisa-chrome-2.4.0.zip`) |
| `release/firefox/` | Firefox AMO XPI (`malisa-firefox-2.4.0.xpi`) |

**GitHub Releases** are split by browser — see [RELEASES.md](RELEASES.md).

| Release | Tag |
|---------|-----|
| Chrome 2.4.0 | `chrome-v2.4.0` |
| Firefox 2.4.0 | `firefox-v2.4.0` |

Store listing docs (separate folders on disk):

- `../malisa-chrome-webstore/` — Chrome Web Store README & ZIP output
- `../malisa-firefox-webstore/` — Firefox AMO README & XPI output

## Quick start (developers)

### Chrome

```bash
cd chrome
npm install
npm run icons   # optional — icons already in repo
# chrome://extensions → Developer mode → Load unpacked → select chrome/
```

### Firefox

Firefox needs a build step (its MV3 background uses `background.scripts`, not a module worker):

```bash
npm install
npm run build:firefox     # → dist/firefox/ + release/firefox/*.xpi
# about:debugging → This Firefox → Load Temporary Add-on → dist/firefox/manifest.json
```

Run / lint with web-ext:

```bash
npm run run:firefox       # web-ext run in a Firefox instance
npm run lint:firefox      # web-ext lint dist/firefox
```

### Build release packages

```bash
npm run build:chrome      # → dist/chrome/ + release/chrome/*.zip
npm run build:firefox     # → dist/firefox/ + release/firefox/*.xpi
```

## Ollama (local models, no API key)

Malisa works with any local Ollama model — Gemma, TranslateGemma, DeepSeek, Qwen, Llama, Mistral, uncensored/abliterated variants, etc.

1. Install and run [Ollama](https://ollama.com), then pull a model, e.g. `ollama pull gemma3:12b`.
2. **CORS**: Ollama must allow the extension origin. Start it with:
   ```bash
   OLLAMA_ORIGINS="chrome-extension://*,moz-extension://*" ollama serve
   ```
   On Windows set the `OLLAMA_ORIGINS` environment variable in System settings, then restart Ollama.
3. In Settings → **Ollama (local)**: keep the default URL `http://localhost:11434`, click ↻ to load installed models from `/api/tags`, or type any model name yourself. Use **Test connection** to verify.
4. Hugging Face models: any GGUF model can be installed directly — `ollama run hf.co/<user>/<repo>` (e.g. `ollama run hf.co/bartowski/gemma-2-9b-it-GGUF`). Type the same `hf.co/...` name in the model field.
5. Options per install: temperature (default 0.2), context size `num_ctx`, `keep_alive`, request timeout. Reasoning models' `<think>` blocks are stripped automatically; TranslateGemma uses its own translation prompt preset.

## Privacy

See [PRIVACY.md](PRIVACY.md).

## License

MIT — see [LICENSE](LICENSE).
