const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { WebSocketServer } = require('ws');
const { chromium } = require(process.env.RECIPE_BOOK_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.RECIPE_BOOK_TEST_OUTPUT || 'test-results');
fs.mkdirSync(out, {recursive:true});
const events = new Map(); let rejectWrites = false, omitFeedRecipe = '';
let videoBytes;
const server = http.createServer((req,res) => {
  const pathname = new URL(req.url,'http://localhost').pathname;
  if (pathname.startsWith('/slow-cleanup/')) { req.on('close',()=>res.destroy()); return; }
  if (pathname === '/fixture.webm') { res.writeHead(200, {'Content-Type':'video/webm'}).end(videoBytes); return; }
  if (pathname === '/upload') { req.resume(); req.on('end',()=>res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({nip94_event:{tags:[['url',`http://127.0.0.1:${server.address().port}/fixture.webm`]]}}))); return; }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : decodeURIComponent(pathname)));
  if (!file.startsWith(root+path.sep)) {res.writeHead(403).end(); return;}
  fs.readFile(file,(err,data)=>{if(err)res.writeHead(404).end();else res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream'}).end(data);});
});
function matches(event, filter) {
  if(filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if(filter.ids && !filter.ids.includes(event.id)) return false;
  if(filter.authors && !filter.authors.includes(event.pubkey)) return false;
  for (const key of Object.keys(filter).filter(k=>k.startsWith('#'))) if(!event.tags.some(t=>t[0]===key.slice(1)&&filter[key].includes(t[1])))return false;
  return true;
}
const relay = new WebSocketServer({server});
relay.on('connection',socket=>socket.on('message',bytes=>{
  const [type,id,...filters] = JSON.parse(bytes);
  if(type==='EVENT') {const e=id;if(!rejectWrites)events.set(e.id,e);socket.send(JSON.stringify(['OK',e.id,!rejectWrites,rejectWrites?'temporary test outage':'']));}
  if(type==='REQ'){ const found=[...events.values()].filter(e=>filters.some(f=>matches(e,f)&&!(e.id===omitFeedRecipe&&!f.ids)));for(const e of found)socket.send(JSON.stringify(['EVENT',id,e]));socket.send(JSON.stringify(['EOSE',id])); }
}));
let browser;
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true,executablePath:process.env.RECIPE_BOOK_BROWSER});
  const errors=[];
  async function visitor(width=1440,height=1000) {
    const context=await browser.newContext({viewport:{width,height}});
    await context.route('**/config.js?*',route=>route.fulfill({contentType:'text/javascript',body:`window.HANIP_CONFIG={backend:'community',communityTag:'local-social-test',communityRelays:['ws://127.0.0.1:${server.address().port}'],communityMediaUrls:['${origin}/upload']};`}));
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>document.getElementById('recipeGrid').getAttribute('aria-busy')==='false');
    await page.evaluate(async()=>{window.testBackend=(await import('./community-backend.js?v=20261115-shorts-v1')).createCommunityBackend(window.HANIP_CONFIG);});
    return {page,context};
  }
  const {page:a}=await visitor();
  videoBytes=Buffer.from(await a.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;const ctx=canvas.getContext('2d');const stream=canvas.captureStream(12);const chunks=[];const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();let frame=0;const timer=setInterval(()=>{ctx.fillStyle=frame++%2?'#c7dca2':'#e9dfc5';ctx.fillRect(0,0,360,640);ctx.fillStyle='#304421';ctx.font='28px sans-serif';ctx.fillText('Recipe playback test',30,250);},80);await new Promise(r=>setTimeout(r,1800));await new Promise(r=>{recorder.onstop=r;recorder.stop();});clearInterval(timer);stream.getTracks().forEach(t=>t.stop());return [...new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())];
  }));
  const fixtures=await a.evaluate(async origin=>{
    await testBackend.claimName('Test cook');
    const base={author_name:'Test cook',description:'A detailed test recipe with ingredients, preparation and cooking tips.',category:'호주식',cuisine:'Australian',difficulty:'쉬움',cook_minutes:10,servings:2,recipe_ingredients:[{item:'Tomatoes',quantity:'2'}],recipe_steps:['Chop the tomatoes carefully and serve.']};
    const photo=await testBackend.publishRecipe({...base,title:'Photo recipe',media:{image:{url:origin+'/assets/recipe-book-logo.png'}}});
    const video=await testBackend.publishRecipe({...base,title:'Video recipe',media:{video:{url:origin+'/fixture.webm'}}});
    const text=await testBackend.publishRecipe({...base,title:'Text recipe',media:{}});
    return {photo:photo.id,video:video.id,text:text.id};
  },origin);
  await a.reload({waitUntil:'networkidle'});
  await a.waitForFunction(()=>document.querySelectorAll('.recipe-card').length===3);
  assert.equal(await a.locator('#profileLabel').innerText(),'Test cook');
  const {page:b}=await visitor(390,844);
  await a.locator('[data-comments-id]').first().click();
  const id=await a.locator('#commentsDialog [data-comment-form]').getAttribute('data-comment-form');
  await a.locator('#commentsDialog [data-react="heart"]:not([disabled])').waitFor();
  await a.locator('#commentsDialog [data-react="heart"]').click();
  await a.waitForFunction(()=>document.querySelector('#commentsDialog [data-react="heart"]').getAttribute('aria-pressed')==='true');
  await a.locator('#commentsDialog [data-react="like"]').click();
  await a.waitForFunction(()=>document.querySelector('#commentsDialog [data-react="like"]').getAttribute('aria-pressed')==='true');
  await a.locator('#commentsDialog [data-react="dislike"]').click();
  await a.waitForFunction(()=>document.querySelector('#commentsDialog [data-react="dislike"]').getAttribute('aria-pressed')==='true');
  assert.equal(await a.locator('#commentsDialog [data-count="likes"]').innerText(),'0');
  assert.equal(await a.locator('#commentsDialog [data-count="dislikes"]').innerText(),'1');
  await a.locator('#commentsDialog textarea').fill('<img src=x onerror=alert(1)> Fresh tip!');
  await a.locator('#commentsDialog [type="submit"]').click();
  await a.locator('#commentsDialog .comment').waitFor();
  assert.equal(await a.locator('#commentsDialog .comment img').count(),0,'comment HTML is escaped');
  await b.locator(`[data-comments-id="${id}"]`).click();
  await b.locator('#commentsDialog .comment').waitFor();
  assert.equal(await b.locator('#commentsDialog [data-count="hearts"]').innerText(),'1');
  assert.equal(await b.locator('#commentsDialog [data-delete-comment]').count(),0);
  assert.match(await b.locator('#commentsDialog .comment').innerText(),/Fresh tip/);
  await b.locator('#commentsDialog textarea').fill('A visitor reply that needs a name.');
  await b.locator('#commentsDialog [type="submit"]').click();
  await b.locator('#profileDialog[open]').waitFor();
  await b.locator('#profileName').fill('Visitor cook');await b.locator('#profileForm [type="submit"]').click();await b.locator('#profileDialog').waitFor({state:'hidden'});
  await b.locator('#commentsDialog [type="submit"]').click();await b.waitForFunction(()=>document.querySelectorAll('#commentsDialog .comment').length===2);
  await a.locator('#commentsDialog [data-social-refresh]').click();await a.waitForFunction(()=>document.querySelectorAll('#commentsDialog .comment').length===2);
  assert.equal(await a.locator('#commentsDialog [data-delete-comment]').count(),1);
  a.on('dialog',d=>d.accept());await a.locator('#commentsDialog [data-delete-comment]').click();await a.waitForFunction(()=>document.querySelectorAll('#commentsDialog .comment').length===1);
  await b.locator('#commentsDialog [data-social-refresh]').click();await b.waitForFunction(()=>document.querySelectorAll('#commentsDialog .comment').length===1);
  rejectWrites=true;
  await a.locator('#commentsDialog textarea').fill('Preserve this unsent draft.');await a.locator('#commentsDialog [type="submit"]').click();await a.waitForFunction(()=>document.querySelector('#commentsDialog .comment-message').textContent.includes('Could not'));
  assert.equal(await a.locator('#commentsDialog textarea').inputValue(),'Preserve this unsent draft.');
  await a.locator('#commentsDialog [data-react="heart"]').click();await a.waitForFunction(()=>!document.querySelector('#commentsDialog [data-react="heart"]').disabled);assert.equal(await a.locator('#commentsDialog [data-count="hearts"]').innerText(),'1');rejectWrites=false;
  await a.locator('[data-close-comments]').click();await b.locator('[data-close-comments]').click();
  // Exact-id lookup must work when the shared post isn't included in the main feed.
  omitFeedRecipe=fixtures.photo;
  await b.goto(origin+'/?recipe='+fixtures.photo,{waitUntil:'networkidle'});await b.locator('#detailDialog[open]').waitFor();assert.equal(await b.locator('#detailTitle').innerText(),'Photo recipe');await b.locator('[data-close-dialog="detailDialog"]').click();omitFeedRecipe='';
  await a.locator('[data-media-filter="video"]').click();await a.locator('[data-open-shorts]').first().click();await a.locator('.short-slide video').waitFor();
  await a.waitForFunction(()=>{const v=document.querySelector('.short-slide video');return v.currentTime>.2&&!v.paused&&v.readyState>=2;});
  assert.equal(await a.locator('.short-slide video').evaluate(v=>v.muted),true);
  await a.locator('[data-short-sound]').click();assert.equal(await a.locator('.short-slide video').evaluate(v=>v.muted),false);
  await a.locator('#shortsDialog [data-comments-id]').click();assert.equal(await a.locator('.short-slide video').evaluate(v=>v.paused),true);await a.locator('[data-close-comments]').click();await a.waitForFunction(()=>!document.querySelector('.short-slide video').paused);
  await a.locator('[data-close-shorts]').click();await a.locator('[data-media-filter="all"]').click();await a.locator('[data-open-shorts]').first().click();
  await a.screenshot({path:path.join(out,'shorts-desktop.png')});
  await a.locator('#shortsViewport').focus();await a.keyboard.press('ArrowDown');await a.waitForTimeout(600);assert.ok(await a.locator('#shortsViewport').evaluate(el=>el.scrollTop)>100);
  for(const size of [{width:390,height:844},{width:844,height:390},{width:360,height:740}]){await a.setViewportSize(size);await a.waitForTimeout(200);assert.equal(await a.locator('#shortsDialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true);assert.equal(await a.locator('#shortsViewport').evaluate(el=>el.scrollWidth<=el.clientWidth),true);await a.screenshot({path:path.join(out,`shorts-${size.width}.png`)});}
  await a.locator('[data-close-shorts]').click();await a.setViewportSize({width:1440,height:1000});
  // All locales preserve the same sidebar placement; Arabic changes text, not the app layout.
  for(const language of ['en','en-AU','ko','ja','fr','it','hi','es-MX','zh-CN','ar']){
    await a.locator('#languageSelect').selectOption(language);assert.equal(await a.locator('html').getAttribute('dir'),'ltr');
    assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await a.locator('[data-comments-id]').first().click();assert.notEqual(await a.locator('#commentsDialog [type="submit"]').innerText(),language.startsWith('en')?'없는 문자열':'Post comment');await a.locator('[data-close-comments]').click();
    await a.setViewportSize({width:390,height:844});
    assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,language+' mobile page');
    await a.locator('[data-open-shorts]').last().click();
    for(const size of [{width:390,height:844},{width:844,height:390}]){await a.setViewportSize(size);assert.equal(await a.locator('#shortsViewport').evaluate(el=>el.scrollWidth<=el.clientWidth),true,language+' shorts overflow');}
    if(language==='ar')await a.screenshot({path:path.join(out,'shorts-arabic-landscape.png')});
    await a.locator('[data-close-shorts]').click();await a.setViewportSize({width:1440,height:1000});
  }
  await a.locator('#languageSelect').selectOption('ko');await a.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await a.screenshot({path:path.join(out,'social-korean.png'),fullPage:true});
  await a.locator('[data-comments-id]').first().click();await a.screenshot({path:path.join(out,'comments-korean.png')});await a.locator('[data-close-comments]').click();
  await a.locator('#languageSelect').selectOption('en');await a.locator('#openComposer').click();
  await a.locator('#recipeTitle').fill('Required field test');await a.locator('#composerNext').click();assert.match(await a.locator('#recipeMessage').innerText(),/20/);
  await a.locator('#recipeDescription').fill('A complete description that tells you how the dish tastes.');await a.locator('#composerNext').click();assert.match(await a.locator('#recipeMessage').innerText(),/country/);
  await a.locator('#recipeCuisine').selectOption('Arab');await a.locator('#recipeCategory').selectOption('아랍식');await a.locator('#composerNext').click();assert.match(await a.locator('#recipeMessage').innerText(),/difficulty/);
  await a.locator('#difficulty').selectOption('쉬움');await a.locator('#composerNext').click();await a.locator('[data-item]').fill('Chickpeas');await a.locator('#steps textarea').fill('Cook the chickpeas and season with salt.');await a.locator('#composerNext').click();assert.match(await a.locator('#recipeMessage').innerText(),/amount/);await a.locator('[data-quantity]').fill('200 g');await a.locator('#composerNext').click();
  await a.locator('[data-media-mode="video"]').click();await a.locator('#videoFile').setInputFiles({name:'invalid.mp4',mimeType:'video/mp4',buffer:Buffer.from('broken')});await a.waitForFunction(()=>document.querySelector('#toast').textContent.includes('cannot be played'));assert.equal(await a.locator('#mediaPreview video').count(),0);
  await a.locator('#videoFile').setInputFiles({name:'valid.webm',mimeType:'video/webm',buffer:videoBytes});await a.locator('#mediaPreview video').waitFor();await a.locator('#publishButton').click();await a.locator('#composerDialog').waitFor({state:'hidden',timeout:20000});
  await b.goto(origin,{waitUntil:'networkidle'});await b.locator('#refreshFeed').click();await b.getByRole('button',{name:'Required field test',exact:true}).click();assert.match(await b.locator('.detail-meta').innerText(),/Arab/);await b.locator('.detail-video').evaluate(v=>v.play());await b.waitForFunction(()=>document.querySelector('.detail-video').currentTime>.2);await b.locator('[data-close-dialog="detailDialog"]').click();
  const cleanupTime=await a.evaluate(async origin=>{const backend=(await import('./community-backend.js?v=20261115-shorts-v1')).createCommunityBackend(window.HANIP_CONFIG);const start=Date.now();await backend.removeUpload({hash:'temporary',server:origin+'/slow-cleanup'});return Date.now()-start;},origin);assert.ok(cleanupTime<18000,'unresponsive media deletion cannot block the recipe UI indefinitely');
  assert.deepEqual(errors,[]);console.log('PASS: signed shared reactions, mutually exclusive votes, two-visitor comments, ownership deletion, XSS escaping, retry/draft retention, exact-id shares, real decoded video playback, shorts navigation/pause/sound, portrait/landscape, 10 languages, Arabic LTR layout, required fields, invalid video rejection, shared upload and bounded media cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();relay.close();server.close();});
