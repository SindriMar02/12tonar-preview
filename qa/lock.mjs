/* The page must be scrollable. Always. This asserts it in the three surfaces where the
 * rAF-driven loader could otherwise leave `overflow:hidden` on the body forever:
 * a normal visible tab, a tab that loads while HIDDEN, and one under reduced motion. */
import puppeteer from 'puppeteer-core';
const URL_=process.env.URL||'http://localhost:8843/';
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,userDataDir:'/private/tmp/claude-501/t12-qa-profile',args:['--hide-scrollbars','--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const out=[];
async function check(label,{hidden=false,rm=false,wait=4200}={}){
  const p=await b.newPage(); await p.setViewport({width:1440,height:900,deviceScaleFactor:1});
  if(rm) await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  if(hidden) await p.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  await p.goto(URL_,{waitUntil:'load'});
  if(hidden){ /* make rAF stop the way a backgrounded tab does */
    const cdp=await p.target().createCDPSession();
    await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
    await p.evaluate(()=>{ Object.defineProperty(document,'visibilityState',{get:()=>'hidden',configurable:true});
      const raf=window.requestAnimationFrame; window.requestAnimationFrame=()=>0; window.__rafKilled=true; });
  }
  await new Promise(r=>setTimeout(r,wait));
  const st=await p.evaluate(()=>{
    const y0=Math.round(scrollY); window.scrollBy(0,1500);
    return {overflow:getComputedStyle(document.body).overflow, cls:document.body.className,
      moved:Math.round(scrollY)-y0, loaderDone:document.querySelector('[data-load]')?.getAttribute('data-done')};
  });
  const pass = !st.overflow.startsWith('hidden') && !/al-loading|al-intro/.test(st.cls) && st.moved>500;
  out.push({label,pass,st}); console.log(`${pass?'PASS':'FAIL'}  ${label.padEnd(34)} overflow=${st.overflow} cls="${st.cls}" moved=${st.moved}`);
  await p.close();
}
await check('normal visible tab');
await check('rAF dead (backgrounded tab)',{hidden:true, wait:7000});
await check('reduced motion',{rm:true, wait:2000});
await b.close();
process.exit(out.every(o=>o.pass)?0:1);
