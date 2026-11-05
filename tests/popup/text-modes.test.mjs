// E2E: popup text modes (Translate / Edit text / Summarize) against a local mock
// Ollama server. Usage: npm run build:chrome && node --test tests/popup/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const extDir = path.resolve('dist/chrome');

function startMock() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      if (req.method === 'OPTIONS') return res.end();
      const json = body ? JSON.parse(body) : {};
      requests.push({ url: req.url, json });
      const system = json.messages?.find((m) => m.role === 'system')?.content ?? '';
      const user = json.messages?.find((m) => m.role === 'user')?.content ?? '';
      if (user.includes('FAIL500')) {
        res.statusCode = 500;
        return res.end('mock failure');
      }
      let content = 'Pozdrav svijete';
      if (system.includes('careful editor')) content = 'Hello, world. This is a test.';
      else if (system.startsWith('Summarize')) content = 'Sažetak teksta.';
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: { content } }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, requests })));
}

test('popup text modes', async () => {
  const { server, requests } = await startMock();
  const port = server.address().port;
  const ctx = await chromium.launchPersistentContext('', {
    executablePath: process.env.CHROME_PATH || undefined,
    headless: false,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  try {
    const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
    const extId = new URL(sw.url()).host;
    await sw.evaluate(async (p) => {
      await chrome.storage.local.set({
        privacy_consent_v1: true,
        settings: {
          activeProvider: 'ollama',
          defaultLanguage: 'hr',
          uiLanguage: 'en',
          providers: { ollama: { baseUrl: `http://127.0.0.1:${p}/v1`, model: 'mock-model' } },
        },
      });
    }, port);
    const page = await ctx.newPage();
    await page.goto(`chrome-extension://${extId}/popup/popup.html`);
    const btn = page.locator('#translateTextBtn');
    await page.waitForFunction(() => document.querySelector('#provider').value === 'ollama');

    // Mode switching preserves input and sends nothing.
    await page.fill('#textInput', 'helo wrld this is a tst');
    await page.click('#modeEdit');
    assert.equal(await btn.textContent(), 'Edit text');
    assert.equal(await page.locator('#langRow').isVisible(), false);
    assert.equal(await page.locator('#textTaskNote').isVisible(), true);
    await page.click('#modeSummarize');
    assert.equal(await btn.textContent(), 'Summarize');
    assert.equal(await page.locator('#summaryLengthRow').isVisible(), true);
    assert.equal(await page.locator('#sourceLanguage').isVisible(), false);
    assert.equal(await page.locator('#textTargetLanguage').isVisible(), true);
    await page.click('#modeTranslate');
    assert.equal(await page.locator('#sourceLanguage').isVisible(), true);
    assert.equal(await page.inputValue('#textInput'), 'helo wrld this is a tst');
    assert.equal(requests.length, 0, 'no request before the action button is clicked');

    // Edit text.
    await page.click('#modeEdit');
    await btn.click();
    await page.waitForFunction(() => document.querySelector('#textOutput').textContent === 'Hello, world. This is a test.');
    let r = requests.at(-1);
    assert.equal(r.url, '/api/chat');
    assert.match(r.json.messages[0].content, /original language/);
    assert.match(r.json.messages[1].content, /<text>\nhelo wrld this is a tst\n<\/text>/);

    // Copy.
    await page.evaluate(() => {
      navigator.clipboard.writeText = async (text) => {
        window.__copied = text;
      };
    });
    await page.click('#copyTextBtn');
    assert.equal(await page.evaluate(() => window.__copied), 'Hello, world. This is a test.');
    assert.equal(await page.locator('#copyTextBtn').textContent(), 'Copied ✓');

    // Summarize (detailed, target hr), input still preserved.
    await page.click('#modeSummarize');
    assert.equal(await page.textContent('#textOutput'), '');
    assert.equal(await page.inputValue('#textInput'), 'helo wrld this is a tst');
    await page.selectOption('#summaryLength', 'detailed');
    await btn.click();
    await page.waitForFunction(() => document.querySelector('#textOutput').textContent === 'Sažetak teksta.');
    r = requests.at(-1);
    assert.match(r.json.messages[0].content, /detailed summary/);
    assert.match(r.json.messages[0].content, /\(hr\)/);

    // Translate still uses the existing TRANSLATE_TEXT path.
    await page.click('#modeTranslate');
    await btn.click();
    await page.waitForFunction(() => document.querySelector('#textOutput').textContent === 'Pozdrav svijete');

    // Provider error is shown.
    await page.click('#modeEdit');
    await page.fill('#textInput', 'FAIL500 text');
    await btn.click();
    await page.waitForFunction(() => !document.querySelector('#textError').classList.contains('hidden'));
    assert.match(await page.textContent('#textError'), /500/);
    assert.equal(await page.locator('#textSpinner').isVisible(), false);

    // Unsupported provider: clear instruction, no request, no auto-switch.
    const before = requests.length;
    await page.selectOption('#provider', 'free');
    assert.equal(await page.locator('#textTaskUnsupported').isVisible(), true);
    assert.match(await page.textContent('#textTaskUnsupportedMsg'), /cannot edit or summarize/);
    assert.equal(await btn.isDisabled(), true);
    await page.click('#modeSummarize');
    assert.equal(await page.locator('#textTaskUnsupported').isVisible(), true);
    assert.equal(await page.inputValue('#provider'), 'free');
    const direct = await page.evaluate(() =>
      chrome.runtime.sendMessage({ type: 'PROCESS_TEXT', task: 'edit', text: 'hello there', provider: 'free' })
    );
    assert.equal(direct.code, 'unsupported');
    await page.click('#modeTranslate');
    assert.equal(await page.locator('#textTaskUnsupported').isVisible(), false);
    assert.equal(await btn.isDisabled(), false);
    assert.equal(requests.length, before);

    // Dark theme still applies.
    await page.click('#themeDark');
    await page.screenshot({ path: process.env.SHOT || '/tmp/popup-text-modes.png' });
  } finally {
    await ctx.close();
    server.close();
  }
});
