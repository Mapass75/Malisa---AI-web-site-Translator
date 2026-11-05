# Mozilla Add-ons (AMO) listing — Malisa 2.6.0

- Package: `release/firefox/malisa-firefox-2.6.0.xpi` — **UNSIGNED**. Only the file Mozilla signs after review is a signed XPI.
- Source package for review: `release/firefox/malisa-firefox-2.6.0-source.zip` (build steps in `SOURCE_BUILD.md`).
- Add-on ID: `malisa@translator.extension` (do not change it after the first upload).
- Firefox desktop 140.0 or newer (`strict_min_version`). Firefox for Android is not declared.
- License: MIT.

## Name
Malisa - AI web site Translator

## Summary (max 250 characters)
Translate whole web pages, selected text or your own text with the AI or free provider you choose, and listen to the result. Right-click "Translate page with Malisa". Bring your own API key; no Malisa servers, no analytics.

## Categories
Language Support and Translation (alternative: Accessibility)

## Description
Malisa translates the web page you are reading into your language and keeps the page layout.

- Translate page from the toolbar popup or by right-clicking the page and choosing "Translate page with Malisa". Uses your saved provider, model and target language.
- Translates all visible text, including text loaded later, open shadow DOM, frames, and alt, title, placeholder and aria-label text. Restore original puts the page back.
- Translate a selection from the right-click menu or the selection popup.
- Popup text box: type or paste text, choose languages, swap, copy.
- Listen / Speak with Browser voices or a cloud voice: OpenAI TTS, Google Cloud TTS, Gemini TTS, ElevenLabs, Microsoft Azure Speech, Amazon Polly, or your own OpenAI-compatible TTS server.
- Providers: OpenAI, Anthropic, Google Gemini, xAI Grok, DeepSeek, Mistral, Groq, OpenRouter, a free option without a key, and Ollama on your own computer.

The text you translate or listen to is sent directly from Firefox to the provider you choose. Firefox asks you to allow sharing website content when you install Malisa.

## Data collection declaration (manifest)

```json
"data_collection_permissions": { "required": ["websiteContent"] }
```

- `websiteContent`: page text, selected text and typed text are sent to the translation or speech provider the user selects, when the user starts an action. This is required for the add-on to work.
- No optional data types. No telemetry, no technical or interaction data.
- API keys are sent only to the service they belong to, to authenticate the user's own request. They are not collected by the developer.

## Privacy policy
Paste the text of `PRIVACY.md` or its public URL.

## Support
- Support site: https://github.com/Mapass75/Malisa---AI-web-site-Translator/issues
- Homepage: https://github.com/Mapass75/Malisa---AI-web-site-Translator

## Notes to reviewer
```
Source code: malisa-firefox-2.6.0-source.zip. Build: `npm ci && npm run build:firefox` (Node.js 20+). Output: dist/firefox and release/firefox/malisa-firefox-2.6.0.xpi.
Only background/bundle.js is generated (esbuild bundle of background/background.js and shared/*.js, not minified). All other files are the original source.
No remote code. Providers return text or audio only.
Testing without an API key: Settings → Translation → provider "Free", then open any article page, right-click → "Translate page with Malisa", or use the toolbar popup → Translate page. Restore original undoes it.
```

## Permissions shown to users and why

| Permission | Why |
|------------|-----|
| `storage` | Settings, API keys and the optional translation cache, stored locally. |
| `activeTab`, `scripting` | Inject Malisa's own content script into the current tab when the user starts a translation. |
| `contextMenus` | "Translate with Malisa" (selection) and "Translate page with Malisa" (page). |
| Provider hosts, `localhost`, `127.0.0.1` | Send the chosen text to the selected provider, or to Ollama / a self-hosted TTS server on the user's computer. |
| Content script on all http/https pages | Read the page text and write the translation back when the user starts it. |

## web-ext lint (web-ext 10.8.0) on `dist/firefox`

- Errors: 0.
- `UNSAFE_VAR_ASSIGNMENT` (17): `innerHTML` with static SVG icons or values escaped with `escapeHtml`. Translations from providers are written with `textContent` / `setAttribute`, never as HTML. Reviewed in `SECURITY_REVIEW.md`.
- `KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION` (1): `data_collection_permissions` needs Firefox for Android 142. Malisa targets Firefox desktop (it uses `contextMenus`, which Android does not support), so no Android version is declared.
