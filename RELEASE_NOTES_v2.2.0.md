# Malisa 2.2.0

Final release — Chrome + Firefox AI web page translator.

## Highlights

- BYOK: OpenAI, Claude, Gemini, DeepSeek, Groq, Mistral, OpenRouter, Ollama
- Fast translation: dedup, L1 RAM cache, SHA-256 disk cache
- Light / dark / system UI theme (popup + on-page overlay)
- Translation cache: on/off, clear, entry count
- API key: show/hide, clear (×), test connection
- Improved AI prompts for UI labels and ALL CAPS text
- `aria-label` and `title` attribute translation
- 7 interface languages

## Downloads

| Browser | File |
|---------|------|
| Chrome | `malisa-chrome-2.2.0.zip` |
| Firefox | `malisa-firefox-2.2.0.xpi` |

Files are in the `release/` folder of this repository.

## Install (developers)

- **Chrome:** `chrome://extensions` → Developer mode → Load unpacked → `chrome/`
- **Firefox:** `about:debugging` → Load Temporary Add-on → `firefox/manifest.json`
