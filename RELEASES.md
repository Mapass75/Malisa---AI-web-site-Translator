# GitHub Releases

Chrome and Firefox are published as **separate releases** (different tags and binaries).

| Browser | Tag | Asset |
|---------|-----|-------|
| **Chrome** | `chrome-v2.2.0` | `release/chrome/malisa-chrome-2.2.0.zip` |
| **Firefox** | `firefox-v2.2.0` | `release/firefox/malisa-firefox-2.2.0.xpi` |

## Create releases on GitHub

### Chrome

1. https://github.com/Mapass75/Malisa---AI-web-site-Translator/releases/new
2. Tag: `chrome-v2.2.0`
3. Title: `Chrome v2.2.0`
4. Description: copy from `release/chrome/RELEASE_NOTES.md`
5. Attach: `release/chrome/malisa-chrome-2.2.0.zip`
6. Publish

### Firefox

1. https://github.com/Mapass75/Malisa---AI-web-site-Translator/releases/new
2. Tag: `firefox-v2.2.0`
3. Title: `Firefox v2.2.0`
4. Description: copy from `release/firefox/RELEASE_NOTES.md`
5. Attach: `release/firefox/malisa-firefox-2.2.0.xpi`
6. Publish

## Build packages

```bash
cd ../malisa-chrome && npm run package
cd ../malisa-firefox && npm run package
```

Then copy into `release/chrome/` and `release/firefox/` before tagging.
