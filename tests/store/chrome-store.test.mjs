// Store-readiness tests for the packaged Chrome build (extracted ZIP).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';

const extDir = '/tmp/malisa-chrome-pkg';
const profileDir = '/tmp/malisa-profile';
const TEST_PAGE = 'http://127.0.0.1:8742/';
const TTS_LOG = '/tmp/mock_tts.log';
const CHROME = process.env.CHROME_PATH || '/home/ubuntu/.local/bin/google-chrome';

async function launch(dir) {
  const ctx = await chromium.launchPersistentContext(dir, {
    executablePath: CHROME, headless: false,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker', { timeout: 15000 }));
  return { ctx, sw };
}
const seed = (sw, patch) => sw.evaluate(async (p) => {
  const { settings = {} } = await chrome.storage.local.get('settings');
  const merged = { ...settings, ...p, providers: { ...(settings.providers ?? {}), ...(p.providers ?? {}) }, speech: { ...(settings.speech ?? {}), ...(p.speech ?? {}) } };
  await chrome.storage.local.set({ settings: merged, privacy_consent_v1: true });
}, patch);

const results = {};
const rec = (k, v) => { results[k] = v; console.log(`RESULT ${k}: ${v}`); };

test('chrome store package', async (t) => {
  const { ctx, sw } = await launch(profileDir);
  const extId = new URL(sw.url()).host;
  await seed(sw, {
    activeProvider: 'free', defaultLanguage: 'hr', uiLanguage: 'en',
    speech: { engine: 'custom', customBaseUrl: 'http://127.0.0.1:8899/v1', customModel: 'kokoro', customVoice: 'af' },
    providers: { openai: { apiKey: '', model: 'gpt-4o-mini' }, free: {} },
  });
  const page = await ctx.newPage();
  await page.goto(TEST_PAGE);

  // Same message the context menu sends (menu click itself proven by desktop screenshots).
  const tabId = await sw.evaluate(async () => (await chrome.tabs.query({ url: 'http://127.0.0.1:8742/' }))[0].id);
  await sw.evaluate(async ([id, lang]) => {
    try { await chrome.tabs.sendMessage(id, { type: 'TRANSLATE_PAGE', targetLanguage: lang }); }
    catch { await chrome.scripting.executeScript({ target: { tabId: id }, files: ['content/content.js'] }); await chrome.tabs.sendMessage(id, { type: 'TRANSLATE_PAGE', targetLanguage: lang }); }
  }, [tabId, 'hr']);
  await page.waitForFunction(() => document.body.innerText.includes('Pozdrav'), { timeout: 30000 });
  rec('chrome: translate page via TRANSLATE_PAGE message (menu path)', 'PASS');

  await page.click('main button');
  await page.waitForFunction(() => document.body.innerText.includes('Knjižnica'), { timeout: 30000 });
  rec('chrome: dynamic content auto-translated (MutationObserver)', 'PASS');

  await sw.evaluate(async (id) => chrome.tabs.sendMessage(id, { type: 'RESTORE_PAGE' }), tabId);
  await page.waitForFunction(() => document.body.innerText.includes('The weather is beautiful'), { timeout: 15000 });
  rec('chrome: restore original', 'PASS');

  // Text box translate + custom TTS listen (popup opened as tab).
  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/popup/popup.html`);
  await popup.waitForSelector('#textInput');
  await popup.fill('#textInput', 'Good morning, how are you?');
  await popup.click('#translateTextBtn');
  await popup.waitForFunction(() => { const t = document.getElementById('textOutput')?.textContent.trim() ?? ''; return t.length > 2 && !/translat|prevod/i.test(t); }, { timeout: 40000 });
  const out = await popup.$eval('#textOutput', el => el.textContent.trim());
  rec('chrome: typed text translation', `PASS ("${out.slice(0, 60)}")`);

  const before = fs.existsSync(TTS_LOG) ? fs.readFileSync(TTS_LOG, 'utf8').split('\n').length : 0;
  await popup.click('#listenOutputBtn');
  await new Promise(r => setTimeout(r, 4000));
  const log = fs.readFileSync(TTS_LOG, 'utf8');
  assert.ok(log.split('\n').length > before && log.includes('REQ'), 'no TTS request seen');
  rec('chrome: Listen via saved custom TTS provider (mock)', 'PASS request reached /v1/audio/speech');

  // Missing API key path (popup uses same isProviderReady check as the menu handler).
  await seed(sw, { activeProvider: 'openai', providers: { openai: { apiKey: '', model: 'gpt-4o-mini' } } });
  const popup2 = await ctx.newPage();
  await popup2.goto(`chrome-extension://${extId}/popup/popup.html`);
  await popup2.waitForSelector('#translateBtn');
  await popup2.click('#translateBtn');
  await popup2.waitForSelector('#status:not(.hidden)', { timeout: 8000 });
  const msg = await popup2.$eval('#status', el => el.textContent);
  assert.match(msg, /API key|Settings/i);
  rec('chrome: missing key -> clear error', `PASS ("${msg.trim().slice(0, 80)}")`);
  await ctx.close();

  // Restart: persistent profile must keep settings (and menu setup is removeAll -> no dup).
  const r2 = await launch(profileDir);
  const stored = await r2.sw.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
  assert.equal(stored.speech.engine, 'custom');
  assert.equal(stored.activeProvider, 'openai');
  assert.equal(stored.defaultLanguage, 'hr');
  rec('chrome: settings persist after browser restart', 'PASS');
  await r2.ctx.close();
  console.log(JSON.stringify(results, null, 1));
});
