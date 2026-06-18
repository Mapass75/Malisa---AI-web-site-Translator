# Malisa for Chrome 2.4.0

Chrome extension (Manifest V3) — translate any web page with your own AI API keys.

## Download

`malisa-chrome-2.4.0.zip` — upload to Chrome Web Store or load unpacked.

## What's new in 2.4.0

- **Selection translate** — highlight text, right-click **Translate with Malisa**
- **Modern floating popup** — glass-style card, smooth animation, rounded close button
- **Text-to-speech** in selection popup — read **original** and **translation** aloud
- TTS engine: **Browser** (free) or **OpenAI API** (Settings → voice & model)

## Also included (since 2.2.0)

- BYOK: OpenAI, Claude, Gemini, DeepSeek, Groq, Mistral, OpenRouter, Ollama
- Dedup + L1 RAM cache + SHA-256 translation cache
- Light / dark / system UI theme
- Cache on/off, clear, entry count
- API key show/hide, clear, test connection
- Improved prompts + `aria-label` / `title` translation
- 7 interface languages

## Install (developers)

```bash
cd chrome
npm install
# chrome://extensions → Developer mode → Load unpacked → chrome/
```

## Privacy

https://github.com/Mapass75/Malisa---AI-web-site-Translator/blob/main/PRIVACY.md
