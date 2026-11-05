// E2E: "Summarize this" / "Explain this" in the selection popup, against a local mock
// Ollama server. Usage: npm run build:chrome && node --test tests/popup/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const extDir = path.resolve('dist/chrome');
const PAGE_HTML =
  '<!doctype html><html lang="en"><head><title>Selection test</title></head><body>' +
  '<h1>Unrelated heading that must never be sent</h1><p id="p">The quick brown fox jumps over the lazy dog.</p></body></html>';

function startMock() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      if (req.method === 'OPTIONS') return res.end();
      if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(PAGE_HTML);
      }
      const json = JSON.parse(body || '{}');
      requests.push(json);
      const system = json.messages?.find((m) => m.role === 'system')?.content ?? '';
      const user = json.messages?.find((m) => m.role === 'user')?.content ?? '';
      if (user.includes('FAIL500')) {
        res.statusCode = 500;
        return res.end('mock failure');
      }
      let content = 'mock translation';
      if (system.startsWith('Explain')) content = 'Simple explanation.';
      else if (system.startsWith('Summarize')) content = 'Short summary.';
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: { content } }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, requests })));
}

const LABELS = {
  en: { summarize: 'Summarize this', explain: 'Explain this', copied: 'Copied ✓', summary: 'Summary' },
  hr: { summarize: 'Sažmi ovo', explain: 'Objasni ovo', copied: 'Kopirano ✓', summary: 'Sažetak' },
};

test('selection popup summarize / explain', async () => {
  const { server, requests } = await startMock();
  const port = server.address().port;
  const ctx = await chromium.launchPersistentContext('', {
    executablePath: process.env.CHROME_PATH || undefined,
    headless: false,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  try {
    const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
    const seed = (lang, provider = 'ollama') =>
      sw.evaluate(
        async ({ p, lang, provider }) => {
          await chrome.storage.local.set({
            privacy_consent_v1: true,
            settings: {
              activeProvider: provider,
              defaultLanguage: lang,
              uiLanguage: lang,
              providers: { ollama: { baseUrl: `http://127.0.0.1:${p}/v1`, model: 'mock-model' } },
            },
          });
        },
        { p: port, lang, provider }
      );
    const page = await ctx.newPage();
    const url = `http://127.0.0.1:${port}/page`;
    await page.goto(url);
    await page.waitForTimeout(800);
    const showPopup = (original, lang) =>
      sw.evaluate(
        async ({ url, original, lang }) => {
          const [tab] = await chrome.tabs.query({ url });
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SELECTION_TRANSLATED',
            original,
            translated: 'EXISTING TRANSLATION',
            targetLanguage: lang,
          });
        },
        { url, original, lang }
      );
    const actionText = page.locator('#malisa-selection-popup .malisa-sel-action-text');
    const errorBox = page.locator('#malisa-selection-popup .malisa-sel-action-result .malisa-sel-error');

    for (const lang of ['en', 'hr']) {
      await seed(lang);
      await page.waitForTimeout(300);
      const L = LABELS[lang];
      const short = 'The quick brown fox jumps over the lazy dog.';
      await showPopup(short, lang);
      const sumBtn = page.locator('.malisa-sel-action[data-task="summarize"]');
      await sumBtn.waitFor();
      assert.equal(await sumBtn.textContent(), L.summarize);
      assert.equal(await page.locator('.malisa-sel-action[data-task="explain"]').textContent(), L.explain);
      const before = requests.length;
      await sumBtn.click();
      await actionText.waitFor();
      assert.equal(await actionText.textContent(), 'Short summary.');
      assert.equal(requests.length, before + 1);
      const req = requests.at(-1);
      assert.equal(req.messages[1].content, `<text>\n${short}\n</text>`, 'only the selection is sent');
      assert.match(req.messages[0].content, new RegExp(`\\(${lang}\\)`));
      assert.ok(!JSON.stringify(req).includes('Unrelated heading'));
      const texts = await page.locator('#malisa-selection-popup .malisa-sel-text').allTextContents();
      assert.ok(texts.includes('EXISTING TRANSLATION'), 'translation is kept');
      assert.ok(texts.includes(short), 'original is kept');
      assert.equal(await page.locator('.malisa-sel-action-result .malisa-sel-label').textContent(), L.summary);
      await page.click('.malisa-sel-copy');
      await page.waitForFunction((t) => document.querySelector('.malisa-sel-copy')?.textContent === t, L.copied, { timeout: 3000 });

      await page.click('.malisa-sel-action[data-task="explain"]');
      await page.waitForFunction(() =>
        document.querySelector('.malisa-sel-action-text')?.textContent === 'Simple explanation.'
      );
      assert.match(requests.at(-1).messages[0].content, /simple, plain language/);

      // Long selection (~3.9k chars, the selection limit is 4000).
      const long = Array.from({ length: 80 }, (_, i) => `Sentence number ${i} explains part of a long article.`).join(' ').slice(0, 3900);
      await showPopup(long, lang);
      await page.click('.malisa-sel-action[data-task="summarize"]');
      await page.waitForFunction(() => document.querySelector('.malisa-sel-action-text')?.textContent === 'Short summary.');
      assert.equal(requests.at(-1).messages[1].content, `<text>\n${long}\n</text>`);

      // Provider error.
      await showPopup('FAIL500 please summarize', lang);
      await page.click('.malisa-sel-action[data-task="summarize"]');
      await errorBox.waitFor();
      assert.match(await errorBox.textContent(), /500/);
      assert.equal(await page.locator('.malisa-sel-action[data-task="summarize"]').isDisabled(), false);
      await page.screenshot({ path: `/tmp/sel-${lang}-error.png` });

      // Unsupported provider: clear message, nothing sent, provider unchanged.
      await seed(lang, 'free');
      await page.waitForTimeout(300);
      await showPopup(short, lang);
      const n = requests.length;
      await page.click('.malisa-sel-action[data-task="explain"]');
      await errorBox.waitFor();
      assert.match(await errorBox.textContent(), /Free translate/);
      assert.equal(requests.length, n);
      const stored = await sw.evaluate(async () => (await chrome.storage.local.get('settings')).settings.activeProvider);
      assert.equal(stored, 'free');
      await seed(lang);
      await page.waitForTimeout(300);
      await showPopup(short, lang);
      await page.click('.malisa-sel-action[data-task="explain"]');
      await actionText.waitFor();
      await page.screenshot({ path: `/tmp/sel-${lang}-explain.png` });
    }

    // Empty selection is rejected by the background with a clear message.
    const extId = new URL(sw.url()).host;
    const ext = await ctx.newPage();
    await ext.goto(`chrome-extension://${extId}/popup/popup.html`);
    const resp = await ext.evaluate(() =>
      chrome.runtime.sendMessage({ type: 'SELECTION_ACTION', task: 'summarize', text: '   ' })
    );
    assert.equal(resp.ok, false);
    assert.match(resp.error, /No text selected/);
  } finally {
    await ctx.close();
    server.close();
  }
});
