# Malisa — AI web site Translator

Translate any web page with **your own AI API keys**. Chrome and Firefox extensions (Manifest V3).

**Version:** 2.4.0

## Features

- BYOK — OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, Mistral, OpenRouter, Ollama
- Full-page translation + restore original
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
| `chrome/` | Chrome extension source — load unpacked in `chrome://extensions` |
| `firefox/` | Firefox extension source — load temporary add-on or use XPI |
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

```bash
cd firefox
npm install
# about:debugging → This Firefox → Load Temporary Add-on → manifest.json
```

### Build release packages

```bash
cd chrome && npm run package    # → ../malisa-chrome-webstore/release/*.zip
cd firefox && npm run package    # → ../malisa-firefox-webstore/release/*.xpi
```

## Privacy

See [PRIVACY.md](PRIVACY.md).

## License

MIT — see [LICENSE](LICENSE).
