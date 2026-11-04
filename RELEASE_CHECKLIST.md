# Release checklist — Chrome Web Store and Mozilla Add-ons (AMO)

Local checks are **not** store approval. Each store reviews the package and decides.

## 1. Build (developer machine or CI)

```sh
npm ci
npm run build:chrome          # release/chrome/malisa-chrome-<version>.zip
npm run build:firefox         # release/firefox/malisa-firefox-<version>.xpi  (UNSIGNED)
npm run build:firefox-source  # release/firefox/malisa-firefox-<version>-source.zip (for AMO review)
npm run lint:firefox          # must report 0 errors
npm run test:security         # needs Chrome; set CHROME_PATH if needed
```

Check:

- [ ] Version is the same in `package.json` and `chrome/manifest.json`, and higher than the version already in each store.
- [ ] `unzip -l release/chrome/malisa-chrome-<version>.zip`: `manifest.json` at the root; no `node_modules`, `.git`, `package.json`, Markdown files, source-only images or keys (only `LICENSE` and runtime files).
- [ ] `unzip -p release/firefox/malisa-firefox-<version>.xpi manifest.json`: `browser_specific_settings.gecko.id` = `malisa@translator.extension`, `strict_min_version` = `140.0`, `data_collection_permissions.required` = `["websiteContent"]`.
- [ ] Load `dist/chrome` (chrome://extensions → Load unpacked) and `dist/firefox` (about:debugging → Load Temporary Add-on) and smoke-test: popup Translate page, right-click **Translate page with Malisa**, Restore original, text box, Listen.

## 2. Things only you can do

- [ ] **Chrome Web Store developer account** (one-time registration fee, paid by you in the Chrome Web Store developer dashboard): https://chrome.google.com/webstore/devconsole
- [ ] **Mozilla Add-ons developer account** (free): https://addons.mozilla.org/developers/
- [ ] **Public privacy policy URL**: merge `PRIVACY.md` into `main` and make sure the repository is public, or host the file elsewhere. Use the URL in both stores.
- [ ] **Support URL**: https://github.com/Mapass75/Malisa---AI-web-site-Translator/issues
- [ ] Check that the screenshots in `store/` show the current version. Replace them if the UI changed.
- [ ] Confirm the store submission. Devin does not submit to stores without your separate confirmation.

## 3. Chrome Web Store submission

1. Developer dashboard → **New item** (or the existing item → **Package** → **Upload new package**) → upload `release/chrome/malisa-chrome-<version>.zip`.
2. **Store listing**: copy text from `STORE_LISTING_CHROME.md`; upload icon 128×128 (`chrome/icons/icon128.png`), at least one 1280×800 screenshot from `store/`, and the small promo tile 440×280 (needs to be created).
3. **Privacy practices**: single purpose, permission justifications, data usage checkboxes, and certifications from `STORE_LISTING_CHROME.md`. Remote code: **No**.
4. **Privacy policy URL**: the public URL from step 2.
5. Submit for review. Wait for the result email.

## 4. AMO submission

1. https://addons.mozilla.org/developers/addon/submit/ → **On this site** (listed).
2. Upload `release/firefox/malisa-firefox-<version>.xpi` (unsigned). Mozilla runs the validator and signs the add-on if it is approved.
3. When asked whether the code was processed by a tool: **Yes** (esbuild bundles the background script). Upload `release/firefox/malisa-firefox-<version>-source.zip`.
4. Copy listing text and **Notes to reviewer** from `STORE_LISTING_FIREFOX.md`.
5. Privacy policy: paste the content of `PRIVACY.md` or its public URL.
6. Submit. Only the file Mozilla returns after approval is a **signed** XPI.

## 5. After approval

- [ ] Tag the version (`git tag v<version>`), push the tag, and create a GitHub release with both packages. Mark the GitHub XPI as unsigned unless it is the file signed by Mozilla.
