/* Frame budget under a real phone profile. Median fps hides the problem this measures:
   read p95 and the count of frames over 32ms, never the median (redesign-craft-ledger #90). */
import puppeteer from 'puppeteer-core';
const URL_ = process.env.URL || 'http://localhost:8843/';
const b = await puppeteer.launch({ executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true,
  userDataDir:'/private/tmp/claude-501/t12-qa-profile', args:['--hide-scrollbars','--use-gl=swiftshader','--enable-unsafe-swiftshader'] });

for (const [w,h,dpr,cpu,label] of [[390,844,3,4,'phone 390 @3x, CPU x4'],[1440,900,1,1,'desktop 1440']]) {
  const p = await b.newPage();
  await p.setViewport({width:w,height:h,deviceScaleFactor:dpr,isMobile:w<760,hasTouch:w<760});
  const cdp = await p.target().createCDPSession();
  if (cpu>1) await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  await p.evaluateOnNewDocument(()=>{const k=()=>{if(document.documentElement)document.documentElement.style.scrollBehavior='auto'};k();document.addEventListener('DOMContentLoaded',k)});
  await p.goto(URL_,{waitUntil:'load'});
  await p.evaluate(()=>document.fonts.ready);
  await new Promise(r=>setTimeout(r,900));
  const r = await p.evaluate(async () => {
    const frames=[]; const longs=[];
    const po=new PerformanceObserver(l=>l.getEntries().forEach(e=>longs.push(Math.round(e.duration))));
    try{po.observe({entryTypes:['longtask']})}catch{}
    let last=performance.now(), run=true;
    const tick=()=>{const n=performance.now();frames.push(n-last);last=n;if(run)requestAnimationFrame(tick)};
    requestAnimationFrame(tick);
    const total=document.documentElement.scrollHeight-innerHeight;
    const t0=performance.now();
    /* a real read: many small steps, not one teleport */
    for(let i=0;i<160;i++){window.scrollTo(0,Math.round(total*i/159));await new Promise(r=>requestAnimationFrame(r))}
    run=false; po.disconnect();
    const el=performance.now()-t0;
    const s=frames.slice(3).sort((a,z)=>a-z);
    return {fps:+(frames.length/(el/1000)).toFixed(1), p50:+s[Math.floor(s.length*0.5)].toFixed(1),
      p95:+s[Math.floor(s.length*0.95)].toFixed(1), worst:+s[s.length-1].toFixed(1),
      over32:s.filter(x=>x>32).length, n:s.length, longTasks:longs.length, worstLong:longs.length?Math.max(...longs):0};
  });
  console.log(`${label}\n  fps ${r.fps}  p50 ${r.p50}ms  p95 ${r.p95}ms  worst ${r.worst}ms  >32ms ${r.over32}/${r.n}  longtasks ${r.longTasks} (worst ${r.worstLong}ms)`);
  await p.close();
}
await b.close();
