# Chrome Web Store Listing — Malisa

## Title
Malisa - AI web site Translator

## Short description (max 132 chars)
Translate any web page with your own AI API keys. Supports OpenAI, Claude, Gemini, Groq, Ollama and more.

## Long description
Malisa translates entire web pages and selected text using AI providers you configure — your keys, your cost control, no account and no tracking.

**Features**
- One-click full-page translation into 30+ languages, with Restore original
- In-page text translation box (popup): source language with auto-detect, target language, swap, listen (text-to-speech) and copy
- Right-click "Translate selection" for highlighted text
- Providers: OpenAI, Claude (Anthropic), Gemini, Groq, DeepSeek, Mistral, OpenRouter, Grok (xAI), local Ollama — plus a Free translate option that needs no API key (public Google endpoint or a configurable LibreTranslate URL)
- Translation cache and deduplication to save API calls; batched requests with progress
- Light/dark/system theme, 7 UI languages
- Skip domains where you never want translation

**Privacy**
- API keys are stored only in your browser's local storage — never sent anywhere except the provider's API
- Page text is sent only to the provider you selected, only when you click Translate
- No analytics, no telemetry, no Malisa servers. See PRIVACY.md

**Optional**
- OpenAI TTS for high-quality speech of selections (uses your OpenAI key)
- Local Ollama for fully offline translation

## Permission justifications
- **storage**: save settings, API keys and the local translation cache on your device
- **activeTab**: translate the page you are looking at only after you click Translate
- **scripting**: inject the content script on demand when it isn't already running
- **contextMenus**: add the "Translate selection" right-click menu item
- **host_permissions** (provider API domains only: api.openai.com, api.anthropic.com, generativelanguage.googleapis.com, api.deepseek.com, api.groq.com, api.mistral.ai, openrouter.ai, api.x.ai, libretranslate.com, api.mymemory.translated.net, translate.googleapis.com, localhost:11434/127.0.0.1:11434): call the translation and model-list endpoints of the providers you configure — including self-hosted Ollama. No broad host access; page text never leaves the tab except to your chosen provider.
- **optional_host_permissions** (http/https): only for custom Ollama or LibreTranslate server URLs you type in Settings, requested at runtime.
- **Content scripts** (http/https): needed to read visible text and insert translations into the page. Declared statically so no per-site host permission is required.

## Compliance notes
- No remote code loading, no eval/new Function; all scripts bundled locally (MV3)
- Minimum permissions; no remote content policy violations
