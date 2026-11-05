# Privacy Policy — Malisa

**Last updated:** November 4, 2026 (version 2.6.0)

Malisa - AI web site Translator ("Malisa", "the extension") translates web pages and text, and can read text aloud, using services **you** choose. Malisa has no servers of its own. The developer does not receive, sell, or share your data and does not use it for advertising.

> This file is the privacy policy. Chrome Web Store and Mozilla Add-ons need a **public URL** for it, for example
> `https://github.com/Mapass75/Malisa---AI-web-site-Translator/blob/main/PRIVACY.md` (works only when the repository is public and this file is on `main`).

## What leaves your device, where it goes, and when

Malisa sends data only when you start an action. It goes directly from your browser to the provider you selected in Settings.

| Data | Sent to | When |
|------|---------|------|
| Text of the current web page (visible text, text added later, `alt`, `title`, `placeholder`, `aria-label`, button labels) | Selected translation provider | When you click **Translate page** in the popup or **Translate page with Malisa** in the right-click menu. While a page stays translated, new text that loads on it is also sent. **Restore original** stops this. |
| Selected text | Selected translation provider | When you use **Translate with Malisa** on a selection or the selection popup |
| Text typed in the popup text box | Selected translation provider | When you click Translate in the text box |
| Text typed in the popup text box (Edit text / Summarize modes) | Selected AI provider (OpenAI, Anthropic, Gemini, Grok, DeepSeek, Mistral, Groq, OpenRouter or your Ollama server) | Only when you click **Edit text** or **Summarize**. Page content is never read for these modes. |
| Text to read aloud (original or translation) | Selected speech provider | When you click Listen or Speak. With **Browser voices**, the text stays in your browser and operating system. |
| API key / access keys | Only to the provider that the key belongs to, in the request header or signature | With every request to that provider |
| Model list request | Selected translation provider | When you open Settings or refresh models |

The translation and speech providers are:

- Translation: OpenAI, Anthropic, Google Gemini, xAI (Grok), DeepSeek, Mistral, Groq, OpenRouter, Free (public Google Translate `gtx` endpoint, MyMemory, or a LibreTranslate-compatible URL you enter), and Ollama on your own computer or server.
- Speech: Browser voices (local), OpenAI TTS, Google Cloud Text-to-Speech, Gemini TTS, ElevenLabs, Microsoft Azure Speech, Amazon Polly, and a custom OpenAI-compatible TTS server you enter (for example Kokoro on `localhost`).

The privacy policy and terms of the provider you choose apply to the data you send it. Some free tiers (for example Gemini and OpenRouter free models) may use submitted text to improve their services. Do not send sensitive text to them.

## What is stored on your device

| Data | Storage | How to remove it |
|------|---------|------------------|
| Settings, API keys, selected providers, models, voices, target language | `storage.local` of the extension | Clear the key field and save, or uninstall the extension |
| Translation cache | `storage.local` of the extension | Turn off or clear the cache in Settings |
| Model lists | `storage.local`, refreshed about every 6 hours | Uninstall the extension |
| Privacy notice accepted | `storage.local` | Uninstall the extension |

API keys are stored in the browser's extension storage **without extra encryption by Malisa**. Other extensions and web pages cannot read it, but anyone with access to your browser profile on the device can. Malisa does not write keys to logs or error messages.

## What Malisa does not do

- No analytics, telemetry, advertising, or tracking.
- No data sent to the developer.
- No remote code. All code is inside the extension package.
- No reading of pages unless you start a translation or a selection action.

## Your controls

- Choose the provider, or use Ollama, a custom local TTS server, or Browser voices to keep text on your own computer or network.
- Click **Restore original** to stop translating a page.
- Turn off or clear the translation cache in Settings.
- Remove API keys in Settings, or uninstall the extension to remove all stored data.

## Contact

Open an issue on [GitHub](https://github.com/Mapass75/Malisa---AI-web-site-Translator/issues).
