const {chromium}=require('playwright');
const assert=require('node:assert/strict');
let browser;
(async()=>{
 browser=await chromium.launch({headless:true,executablePath:process.env.RECIPE_BOOK_BROWSER});
 const page=await browser.newPage();await page.goto('https://dohoon819.github.io/hanip-recipe/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#recipeGrid')?.getAttribute('aria-busy')==='false');
 const media=await page.locator('.recipe-card video').evaluateAll(videos=>videos.map(v=>({url:v.currentSrc||v.src,title:v.closest('.recipe-card').querySelector('h3').textContent})));
 const results=[];
 for(const item of media){const result=await page.evaluate(async item=>{
   const video=document.createElement('video');video.muted=true;video.playsInline=true;video.src=item.url;document.body.append(video);
   try { await Promise.race([video.play(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Playback timeout')),20000))]);await new Promise(r=>setTimeout(r,700));return {...item,ready:video.readyState,time:video.currentTime,width:video.videoWidth,passed:video.currentTime>0&&video.readyState>=2}; }
   catch(error){return {...item,passed:false,error:error.message};}finally{video.pause();video.removeAttribute('src');video.load();video.remove();}
 },item);results.push(result);console.log(JSON.stringify(result));}
 console.log(JSON.stringify({publicVideos:media.length,passed:results.filter(r=>r.passed).length}));assert.ok(results.every(r=>r.passed),'A public video needs attention.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
