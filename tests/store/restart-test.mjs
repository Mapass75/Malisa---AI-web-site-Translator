import { chromium } from 'playwright';
const extDir='/tmp/malisa-chrome-pkg';
const run=Number(process.env.RUN??1);
const ctx=await chromium.launchPersistentContext(process.env.PROFILE??`/tmp/malisa-rt${run}`,{executablePath:'/home/ubuntu/.local/bin/google-chrome',headless:false,args:[`--disable-extensions-except=${extDir}`,`--load-extension=${extDir}`,'--window-position=600,50','--window-size=900,700']});
const sw=ctx.serviceWorkers()[0]??await ctx.waitForEvent('serviceworker',{timeout:15000});
const p=await ctx.newPage();
await p.goto('http://127.0.0.1:8742/');
await p.waitForTimeout(800);
if(process.env.SEED!=='0'){
  await sw.evaluate((skip)=>chrome.storage.local.set({settings:{activeProvider:'free',defaultLanguage:'hr',uiLanguage:'hr',skipDomains:skip?['127.0.0.1']:[],providers:{},speech:{engine:'browser'}},privacy_consent_v1:true}),process.env.SEED_SKIP==='1');
  await p.reload(); await p.waitForTimeout(500);
}
console.log('READY run'+run);
await new Promise(()=>{});
