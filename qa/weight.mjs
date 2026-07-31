import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, userDataDir:'/private/tmp/claude-501/t12-qa-profile', args:['--hide-scrollbars','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const p = await b.newPage(); await p.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const by={}; let n=0;
p.on('response', async res => { try{ const buf=await res.buffer(); const t=(res.request().resourceType()||'other'); by[t]=(by[t]||0)+buf.length; n++; }catch{} });
await p.evaluateOnNewDocument(()=>{const k=()=>{if(document.documentElement)document.documentElement.style.scrollBehavior='auto'};k();document.addEventListener('DOMContentLoaded',k)});
await p.goto('http://localhost:8843/',{waitUntil:'load'});
await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,600));
const t = await p.evaluate(()=>{const e=performance.getEntriesByType('navigation')[0];const fcp=performance.getEntriesByName('first-contentful-paint')[0];return {dcl:Math.round(e.domContentLoadedEventEnd),load:Math.round(e.loadEventEnd),fcp:fcp?Math.round(fcp.startTime):null}});
console.log('--- initial load (above the fold) ---');
console.log(Object.entries(by).map(([k,v])=>`${k} ${(v/1024).toFixed(0)}K`).join('  '), `| ${n} requests | total ${(Object.values(by).reduce((a,c)=>a+c,0)/1024).toFixed(0)}K`);
console.log('FCP', t.fcp+'ms', 'DCL', t.dcl+'ms', 'load', t.load+'ms');
// now the full page, lazy images included
const before=Object.values(by).reduce((a,c)=>a+c,0);
const total=await p.evaluate(async()=>{const H=document.documentElement.scrollHeight;for(let y=0;y<H;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}return H});
await new Promise(r=>setTimeout(r,2500));
const after=Object.values(by).reduce((a,c)=>a+c,0);
console.log(`--- whole page (${total}px) --- ${(after/1024).toFixed(0)}K total, ${( (after-before)/1024).toFixed(0)}K lazy-loaded after first paint, ${n} requests`);
await b.close();
