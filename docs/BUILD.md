# Build instructions

## Requirements

- Node.js 18+ (developed on Node 26)
- `npm install` — installs `sharp` (devDependency, icon generation only)
- Windows `tar` (bsdtar, ships with Windows 10+) for ZIP creation

## Build

```bash
node scripts/build-dist.mjs
```

Produces:

| Output | Purpose |
|---|---|
| `dist/chrome/` | Unpacked Chrome extension — `chrome://extensions` → Load unpacked |
| `dist/firefox/` | Unpacked Firefox extension — `about:debugging` → Load Temporary Add-on |
| `release/malisa-chrome-<version>.zip` | Chrome Web Store upload |
| `release/malisa-firefox-<version>.zip` | AMO upload (**unsigned** until Mozilla signs) |
| `release/malisa-source-<version>.zip` | Reviewable source for store review |

`manifest.json` is at the root of every ZIP. The build aborts if a forbidden
file name (`nul`, `con`, `aux`, `prn`, `com1-9`, `lpt1-9`) or a potentially
sensitive file (`.env*`, `*secret*`, `*credential*`) is found in the output.

## Icons

`icons/icon{16,32,48,128}.png` are pre-generated and committed — no build
step needed. `node scripts/generate-icons.mjs` can regenerate them from a
source artwork (`assets/malisa-source.png`, not shipped in this repo); only
needed if the icon artwork ever changes.

## Verify

```bash
# Syntax-check every shipped JS file
for f in $(find dist -name "*.js"); do node --check "$f"; done

# Firefox lint
npx web-ext lint --source-dir dist/firefox

# JSON sanity
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))"
```

## What is NOT in the packages

- `node_modules/`, `.git/`, `.devin/`, `dist/`, `release/`
- Dev previews: `chat-preview.*`, `popup-preview.html`, `options/options-preview.html`
- Docs (`*.md`) and `package.json` — source ZIP only
- API keys / `.env` — never commit; keys live in `browser.storage.local` at runtime
