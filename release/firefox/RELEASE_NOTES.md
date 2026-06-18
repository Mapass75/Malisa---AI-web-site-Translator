# Malisa for Firefox 2.4.0

Firefox extension (Manifest V3) — translate any web page with your own AI API keys.

## Download

`malisa-firefox-2.4.0.xpi` — upload to Firefox Add-ons (AMO) or install temporarily.

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
cd firefox
npm install
# about:debugging → This Firefox → Load Temporary Add-on → manifest.json
```

## Privacy

https://github.com/Mapass75/Malisa---AI-web-site-Translator/blob/main/PRIVACY.md
