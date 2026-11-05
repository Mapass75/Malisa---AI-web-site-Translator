// Regression test: a stored model name must never be parsed as HTML on the options page.
// Usage: npm run build:chrome && npm run test:security  (CHROME_PATH overrides the browser binary)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const extDir = path.resolve('dist/chrome');
const payload = 'gpt"></option></select><b id="pwned">INJECTED</b><select><option>';

test('stored model name is escaped in the options model select', async () => {
  const ctx = await chromium.launchPersistentContext('', {
    executablePath: process.env.CHROME_PATH || undefined,
    headless: false,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  try {
    const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
    const extId = new URL(sw.url()).host;
    await sw.evaluate(async (model) => {
      const { settings = {} } = await chrome.storage.local.get('settings');
      settings.providers = settings.providers ?? {};
      settings.providers.openai = { ...(settings.providers.openai ?? {}), model };
      await chrome.storage.local.set({ settings, privacy_consent_v1: true });
    }, payload);

    const page = await ctx.newPage();
    await page.goto(`chrome-extension://${extId}/options/options.html`);
    await page.waitForTimeout(1500);

    assert.equal(await page.locator('#pwned').count(), 0, 'model name was injected as HTML');
    const values = await page.$$eval('select option', (opts) => opts.map((o) => o.value));
    assert.ok(values.includes(payload), 'saved model should still be shown as a plain option');
  } finally {
    await ctx.close();
  }
});
