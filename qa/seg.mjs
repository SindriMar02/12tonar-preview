/* fps per SECTION, so a cost is attributed rather than guessed. CPU x4 by default:
   a modern phone is faster, but anything smooth here is smooth everywhere. */
import puppeteer from 'puppeteer-core';
const W=Number(process.env.W)||1440, H=Number(process.env.H)||900, CPU=Number(process.env.CPU)||4;
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,userDataDir:'/private/tmp/claude-501/t12-qa-profile',args:['--hide-scrollbars','--use-gl=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage(); await p.setViewport({width:W,height:H,deviceScaleFactor:W<760?3:1,isMobile:W<760,hasTouch:W<760});
const cdp=await p.target().createCDPSession(); if(CPU>1) await cdp.send('Emulation.setCPUThrottlingRate',{rate:CPU});
await p.goto(process.env.URL||'http://localhost:8843/',{waitUntil:'load'});
await p.evaluate(()=>document.fonts.ready); await new Promise(r=>setTimeout(r,3000));
const out=await p.evaluate(async()=>{
  const secs=[...document.querySelectorAll('main > section, footer')].map(s=>({id:s.id||s.className.split(' ')[0],top:s.offsetTop,h:s.offsetHeight}));
  const res=[];
  for(const s of secs){
    const end=Math.min(s.top+s.h, document.documentElement.scrollHeight-innerHeight);
    if(end<=s.top) continue;
    window.scrollTo(0,s.top); await new Promise(r=>setTimeout(r,600));
    const fr=[]; const longs=[];
    const po=new PerformanceObserver(l=>l.getEntries().forEach(e=>longs.push(Math.round(e.duration))));
    try{po.observe({entryTypes:['longtask']})}catch{}
    let last=performance.now(),run=true;
    const tick=()=>{const n=performance.now();fr.push(n-last);last=n;if(run)requestAnimationFrame(tick)};
    requestAnimationFrame(tick); const t0=performance.now();
    for(let i=0;i<44;i++){window.scrollTo(0,s.top+((end-s.top)*i/43)); await new Promise(r=>requestAnimationFrame(r));}
    run=false; po.disconnect();
    const el=performance.now()-t0; const ss=fr.slice(2).sort((a,z)=>a-z);
    res.push({id:s.id, fps:+(fr.length/(el/1000)).toFixed(1), p95:+ss[Math.floor(ss.length*.95)].toFixed(0), over:ss.filter(x=>x>32).length, n:ss.length, lt:longs.length, worstLt:longs.length?Math.max(...longs):0});
  }
  return res;
});
console.log(`--- ${W}x${H} CPU x${CPU} ---`);
out.forEach(s=>console.log(`${String(s.id).padEnd(12)} fps ${String(s.fps).padStart(5)}  p95 ${String(s.p95).padStart(4)}ms  >32 ${String(s.over).padStart(2)}/${s.n}  longtasks ${s.lt}${s.worstLt?' (worst '+s.worstLt+'ms)':''}`));
await b.close();
