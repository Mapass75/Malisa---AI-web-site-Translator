# Building Malisa from source (for AMO review)

The Firefox add-on is built from the source in `chrome/`. The build copies the files and bundles `background/background.js` into one `background/bundle.js` with esbuild, because Firefox has no module service worker. Nothing is minified or obfuscated.

## Requirements

- Node.js 20 or newer (tested with Node.js 26.13.0) and npm
- Linux, macOS or Windows

## Steps

```sh
npm ci                  # installs the exact versions from package-lock.json
npm run build:firefox   # writes dist/firefox/ and release/firefox/malisa-firefox-<version>.xpi
```

`dist/firefox/` is the unpacked add-on. Its files should match the submitted XPI.

## What the build does

- `scripts/build.mjs firefox`:
  - copies `chrome/` to `dist/firefox/`, leaving out source-only files;
  - bundles the background script with esbuild (`format: iife`, `target: firefox140`, not minified);
  - adds `browser_specific_settings.gecko` (ID, minimum version, data collection declaration);
  - switches `options_page` to `options_ui`.
- `scripts/zip.mjs firefox` zips `dist/firefox/` into the XPI. `manifest.json` is at the root of the ZIP.

All other files in the package are the original, unprocessed source files.
