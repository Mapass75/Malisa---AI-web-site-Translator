# Chrome Web Store listing — Malisa 2.6.0

Package: `release/chrome/malisa-chrome-2.6.0.zip` (`manifest.json` at the root). Also works in Microsoft Edge.

## Name
Malisa - AI web site Translator

## Short description (max 132 characters)
Translate whole web pages, selected text or your own text with the AI or free provider you choose, and listen to the result.

## Category
Tools (alternative: Accessibility)

## Language
English (the extension UI also has Croatian, Serbian, German, Italian, French and Spanish)

## Description
Malisa translates the web page you are reading into your language and keeps the page layout.

Features:
- Translate page: from the toolbar popup or by right-clicking the page and choosing "Translate page with Malisa". Uses your saved provider, model and target language.
- Translates all visible text, including text loaded later (infinite scroll, "See more"), open shadow DOM, frames, and `alt`, `title`, `placeholder` and `aria-label` text.
- Restore original puts the page back as it was.
- Translate a selection from the right-click menu or the selection popup.
- Text box in the popup: type or paste text, choose languages, swap, copy.
- Listen / Speak: read the original or the translation with Browser voices or a cloud voice (OpenAI TTS, Google Cloud TTS, Gemini TTS, ElevenLabs, Microsoft Azure Speech, Amazon Polly, or your own OpenAI-compatible TTS server).
- Translation providers: OpenAI, Anthropic, Google Gemini, xAI Grok, DeepSeek, Mistral, Groq, OpenRouter, a free option without a key, and Ollama on your own computer.
- Translation cache to save tokens. Light and dark themes.

You bring your own API key. The text you translate or listen to is sent directly from your browser to the provider you choose. Malisa has no servers of its own and no analytics.

Privacy policy: <PUBLIC PRIVACY POLICY URL>

## Single purpose (Privacy practices tab)
Malisa translates web page text, selected text and typed text into the user's language with a provider the user chooses, and can read the original or translated text aloud.

## Permission justifications (Privacy practices tab)

| Permission | Justification |
|------------|---------------|
| `storage` | Saves the user's settings, API keys, chosen providers and voices, and the optional translation cache on the device (`storage.local`). |
| `activeTab` | Gives access to the current tab after the user clicks the toolbar button or a Malisa context-menu item, so the page can be translated. |
| `scripting` | Injects Malisa's own packaged content script into the current tab when it is not running yet (for example on tabs opened before install), so Translate page works without a reload. |
| `contextMenus` | Adds two right-click items: "Translate with Malisa" for selected text and "Translate page with Malisa" for the whole page. |
| Host permissions for provider APIs (api.openai.com, api.anthropic.com, generativelanguage.googleapis.com, api.x.ai, api.deepseek.com, api.mistral.ai, api.groq.com, openrouter.ai, translate.googleapis.com, api.mymemory.translated.net, libretranslate.com, texttospeech.googleapis.com, api.elevenlabs.io, *.tts.speech.microsoft.com, *.amazonaws.com) | Sends the text the user chose to translate or listen to, from the background service worker to the provider the user selected. `*.tts.speech.microsoft.com` and `*.amazonaws.com` are wildcards because the Azure and Polly endpoint contains the region the user enters (for example `westeurope.tts.speech.microsoft.com`, `polly.eu-central-1.amazonaws.com`). |
| `http://localhost/*`, `http://127.0.0.1/*` (including port 11434) | Connects to Ollama or a self-hosted TTS server (for example Kokoro) that the user runs on their own computer. |
| Optional host permissions `http://*/*`, `https://*/*` | Requested at runtime only when the user enters a custom server URL (Ollama on another machine, LibreTranslate-compatible server) in Settings, and only for that origin. |
| Content script on `http://*/*`, `https://*/*` (all frames) | Reads the page text and writes the translation back into the same page when the user starts a translation, and shows the selection popup. It does nothing until the user acts. |

## Remote code
No, I am not using remote code. All JavaScript is in the package. Providers return only text or audio data, which is never executed.

## Data usage (Privacy practices tab)

Check these, because the selected data is sent to the provider the user chooses:

- [x] **Website content** — page text, selected text and typed text are sent to the selected translation or speech provider when the user starts an action.
- [x] **Authentication information** — the user's own API key is sent only to the provider it belongs to. It is stored locally and never sent to the developer.

Leave the others unchecked (no personally identifiable info, health, financial, personal communications, location, web history, or user activity collection by Malisa).

Certify:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

The transfer to the provider is the approved use case: it is required for the single purpose and the user chooses the provider.

## Graphics

| Asset | Requirement | File |
|-------|-------------|------|
| Store icon | 128×128 PNG | `chrome/icons/icon128.png` |
| Screenshots | 1280×800 or 640×400, 1 to 5 | `store/*.png` (check they match 2.6.0) |
| Small promo tile | 440×280 | not created yet, optional |

## Test instructions for the reviewer (optional field)
1. Open any article page, right-click the page and choose "Translate page with Malisa", or open the toolbar popup and click Translate page.
2. Without an API key, choose the "Free" provider in Settings → Translation. It needs no account.
3. Click "Restore original" in the popup to undo.
