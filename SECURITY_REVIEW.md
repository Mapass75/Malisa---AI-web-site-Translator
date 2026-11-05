# Security review

Scope: the extension source in `chrome/` (shared by the Chrome/Edge and Firefox builds) and the build scripts. Generated folders (`dist/`, `release/`, `node_modules/`) were not reviewed.

## Tools

| Tool | Status | Result |
| --- | --- | --- |
| Devin Security (code scan) | Available. Waiting for the scan setup to be approved | _pending_ |
| Snyk | Not configured in this workspace. Needs a Snyk account and token | Not run |
| SonarQube / SonarCloud | Listed in the integration marketplace, not installed. Needs an account and token | Not run |
| semgrep 1.183.0 (`p/javascript`, `p/secrets`, `p/xss`) on `chrome/`, `scripts/` | Run | 0 findings |
| gitleaks 8.18.4, full git history (36 commits) | Run | 2 hits, both false positives: `CONSENT_KEY = 'privacy_consent_v1'` in `storage.js` |
| `npm audit` | Run | 17 advisories, all in build-only dev tools (`web-ext`, `archiver` and their dependencies). None of this code ships in the extension |
| `web-ext lint` (Firefox build) | Run | 0 errors, 17 `UNSAFE_VAR_ASSIGNMENT` warnings (`innerHTML`) and 1 Android API warning. Each `innerHTML` was checked by hand, see below |
| Playwright + Chrome (built extension) | Run | Used to reproduce finding 1 and to verify the fix |

## Confirmed findings

### 1. HTML injection on the Settings page through a saved model name (low)

`fillModelSelect` in `chrome/options/options.js` inserted the saved model name into `innerHTML` without escaping. This happened when no model list was loaded, which is always the case on page load. A model name can come from a provider's model list (for example OpenRouter or Ollama), so a crafted name ended up in the page as HTML.

- Reproduced: storing `gpt"></option></select><b id="pwned">…` as the OpenAI model and opening Settings put a real `<b id="pwned">` element into the page.
- Impact: HTML injection only. The extension CSP (`script-src 'self'`) blocks inline scripts and event handlers, so no script execution was possible.
- Fix: the name is now escaped with the existing `escapeHtml`, as in the other branch of the same function. The saved model is still shown and selected.
- Test: `tests/security/options-model-injection.test.mjs` (`npm run test:security`). It fails on the old code ("model name was injected as HTML") and passes with the fix.

## Checked, not exploitable (no code change)

- **API keys**: stored in `browser.storage.local` and never written to the console. Keys are sent only to the provider they belong to, over HTTPS (except user-configured local Ollama/custom TTS). `sanitizeErrorMessage` hides common key formats in error text. It does not cover ElevenLabs/Azure/AWS formats, but those errors are shown only to the user and never logged.
- **Permissions**: `storage`, `activeTab`, `scripting`, `contextMenus`, plus host permissions for the listed providers. `https://*.amazonaws.com/*` is broader than Polly needs, because match patterns cannot express `polly.<region>.amazonaws.com`. `localhost`/`127.0.0.1` are needed for Ollama and self-hosted TTS. There are no `web_accessible_resources` and no `externally_connectable`.
- **Messages between page and extension**: web pages cannot message the background script, because there is no `externally_connectable` and no `window.postMessage` listener. `assertTrustedSender` accepts any part of this extension. Content scripts only send `TRANSLATE_PAGE`, `GET_TTS_SETTINGS` and `SPEAK_SELECTION`. `FETCH_MODELS`/`REFRESH_ALL_MODELS` are sent only by Settings, and `TRANSLATE_TEXT` only by the popup. Limiting those to extension pages would be extra hardening, but no exploit path from a web page was found.
- **Rendering translations**: translated text is written with `textContent` / `setAttribute`, never as HTML. The popup output uses `textContent`. The `innerHTML` in `content.js` holds only static SVG icons.
- **Selection popup Speak button**: the popup opens only from the user's context-menu click. A page could script a click on the button, but that only replays the same text, and the audio is cached.
- **Ollama and local/custom TTS**: the URLs come only from the user's own settings. `validateOllamaBaseUrl` allows only http/https and rejects URLs with credentials. A web page cannot change these URLs.
- **Dynamic page content**: after the user translates a page, new text added by that page is translated too, as designed. This uses the user's quota on that page.

## Not checked

- Firefox runtime: no Firefox binary on the test machine. Only `web-ext lint` was run on the Firefox build.
- Snyk and SonarQube: not configured, see the table.
- Real calls with valid provider keys: none were available. Error paths were tested earlier with invalid keys.

## Devin Security scan (scan-490e5ffc016242a4a45ea354fb564d91, deep effort, 2026-11-04)

7 findings, triaged:

| Finding | Verdict | Action |
|---|---|---|
| Saved model name HTML injection in Settings | confirmed (low) | fixed in 2.5.6 (escapeHtml) + regression test |
| Privacy consent + "Skip domains" stored but never enforced | confirmed (low) | fixed in 2.6.1: `hasPrivacyConsent()` checked in `resolveProvider` (all translation paths); `isDomainSkipped()` checked per tab URL in `translateAllBlocks` |
| Content script loads all saved API keys; background trusts content scripts | accepted (low) | `assertTrustedSender` already gates messages; content script only reads `settings` for UI language/theme/speech — keys never sent to pages. No change. |
| Cache-key poisoning via forged page text (2x) | accepted (medium) | provider output is keyed by exact source text; poison requires an attacker-controlled page + affects display only. Dismissed/accepted. |
| Unbounded API spend via iframes/MutationObserver (2x) | accepted (medium) | translation is user-triggered; observer reuses cache and user-set batch limits. Dismissed/accepted. |

Verification: `isDomainSkipped` unit cases all pass; end-to-end check on Chrome 2.6.1 — menu item on a skipped domain leaves the page untranslated (dbg marker `hit:true`).
