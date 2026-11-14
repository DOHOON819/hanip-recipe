const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.RECIPE_BOOK_PLAYWRIGHT || 'playwright');
const root = path.resolve(process.env.RECIPE_BOOK_ROOT || path.resolve(__dirname, '..'));
const out = path.resolve(process.env.RECIPE_BOOK_TEST_OUTPUT || 'test-results');
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => { if (err) res.writeHead(404).end(); else { res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(data); } });
});
function mockBackend() {
  const sample = [
    { id:'photo-one', author_id:'other', title:'Tomato & basil pasta', category:'면·파스타', cook_minutes:20, difficulty:'쉬움', image_url:'/assets/recipe-book-logo.png', video_url:null },
    { id:'video-one', author_id:'other', title:'A quick Korean bowl', category:'한식', cook_minutes:15, difficulty:'쉬움', image_url:null, video_url:'https://example.test/test.webm' },
    { id:'dessert-one', author_id:'other', title:'Weekend chocolate cake', category:'디저트', cook_minutes:55, difficulty:'보통', image_url:'/assets/recipe-book-logo.png', video_url:null }
  ].map((r, i) => ({ ...r, image_url:r.image_url ? location.origin + r.image_url : null, description:'Test fixture, never published.', servings:2, visibility:'published', image_fit:'cover', created_at:'2026-11-' + (15-i) + 'T12:00:00Z', profiles:{display_name:'Test kitchen'}, recipe_ingredients:[{position:0,item:'Tomatoes',quantity:'200 g'}], recipe_steps:[{position:0,instruction:'Prepare the ingredients.'},{position:1,instruction:'Cook and serve.'}] }));
  const data = window.__recipeTest = { recipes:sample, profiles:[{id:'test-user',display_name:'Test Chef'}], recipe_ingredients:[], recipe_steps:[], uploads:[], removals:[], failChildren:false, failFeed:false, session:null };
  const session = { user:{id:'test-user'}, access_token:'test-only' };
  data.session = session;
  function query(table) {
    let action='select', payload, filters=[], one=false;
    const api = {
      select(){return api;}, order(){return api;}, eq(k,v){filters.push([k,v]);return api;},
      insert(v){action='insert';payload=v;return api;},update(v){action='update';payload=v;return api;},
      delete(){action='delete';return api;},single(){one=true;return api;},maybeSingle(){one=true;return api;},
      then(resolve,reject){return Promise.resolve().then(()=>{
        if(table==='recipes' && action==='select' && data.failFeed) return {data:null,error:{message:'Network failed'}};
        if(data.failChildren && table==='recipe_steps' && action==='insert') return {data:null,error:{message:'Test step failure'}};
        let rows=data[table] || (data[table]=[]);
        if(action==='insert') {
          if(table==='profiles' && payload.display_name.toLowerCase()==='taken') return {data:null,error:{code:'23505',message:'duplicate'}};
          const added=(Array.isArray(payload)?payload:[payload]).map(x=>({...x,id:x.id || ('test-' + Math.random().toString(16).slice(2)),created_at:new Date().toISOString()}));
          rows.push(...added); return {data:one?added[0]:added,error:null};
        }
        const matches = row=>filters.every(([k,v])=>row[k]===v);
        const selected=rows.filter(matches);
        if(action==='update') {
          if(table==='profiles' && payload.display_name.toLowerCase()==='taken') return {data:null,error:{code:'23505',message:'duplicate'}};
          selected.forEach(row=>Object.assign(row,payload));
        }
        if(action==='delete') data[table]=rows.filter(row=>!matches(row));
        return {data:one?(selected[0]||null):selected.map(row=>table==='recipes'?{...row,profiles:row.profiles || {display_name:'Test Chef'},recipe_ingredients:row.recipe_ingredients || data.recipe_ingredients.filter(x=>x.recipe_id===row.id),recipe_steps:row.recipe_steps || data.recipe_steps.filter(x=>x.recipe_id===row.id)}:row),error:null};
      }).then(resolve,reject);}
    }; return api;
  }
  window.__mockClient = {
    from:query,
    auth:{getSession:async()=>({data:{session:data.session},error:null}),signInAnonymously:async()=>{data.session=session;return {data:{session},error:null};},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};}},
    storage:{from:bucket=>({getPublicUrl:p=>({data:{publicUrl:location.origin+'/assets/recipe-book-logo.png'}}),remove:async p=>{data.removals.push({bucket,paths:p});return {error:null};}})}
  };
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true, ...(process.env.RECIPE_BOOK_BROWSER ? {executablePath:process.env.RECIPE_BOOK_BROWSER} : {})});
  const context=await browser.newContext({viewport:{width:1440,height:1050}});
  await context.route('**/fonts.googleapis.com/**',route=>route.continue());
  await context.addInitScript(mockBackend);
  await context.route('**/supabase-js@2/+esm',route=>route.fulfill({contentType:'text/javascript',body:'export function createClient(){return window.__mockClient;}'}));
  await context.route('**/nostr-tools@2/+esm',route=>route.fulfill({contentType:'text/javascript',body:'export const generateSecretKey=()=>new Uint8Array(32); export const getPublicKey=()=>"test"; export const finalizeEvent=x=>x; export const verifyEvent=()=>true;'}));
  await context.route('**/tus.min.js',route=>route.fulfill({contentType:'text/javascript',body:'window.tus={Upload:class{constructor(file,opts){this.opts=opts;} start(){window.__recipeTest.uploads.push(this.opts.metadata);this.opts.onProgress(100,100);this.opts.onSuccess();}}};'}));
  await context.route('https://example.test/**',route=>route.fulfill({status:204,body:''}));
  const page=await context.newPage();
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin,{waitUntil:'networkidle'});
  await page.locator('.recipe-card').first().waitFor();
  assert.equal(await page.title(),'Recipe Book — Good food. Worth sharing.');
  assert.equal(await page.locator('.recipe-card').count(),3);
  assert.equal(await page.locator('#recipeCategory option').count(),16);
  for (const category of ['일식','중식','멕시칸','아메리칸','프렌치','이탈리안','브런치','도시락','간편식']) assert.equal(await page.locator(`#recipeCategory option[value="${category}"]`).count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
  await page.locator('[data-media-filter="video"]').click();
  assert.equal(await page.locator('.recipe-card').count(),1);
  assert.match(await page.locator('.recipe-card').innerText(),/Korean/);
  await page.locator('[data-media-filter="image"]').click();
  assert.equal(await page.locator('.recipe-card').count(),2);
  await page.locator('[data-save-id="photo-one"]').click();
  await page.locator('[data-media-filter="saved"]').click();
  assert.equal(await page.locator('.recipe-card').count(),1);
  assert.match(await page.locator('#feedSubtitle').innerText(),/this device/);
  await page.reload({waitUntil:'networkidle'});
  await page.locator('[data-media-filter="saved"]').click();
  assert.equal(await page.locator('.recipe-card').count(),1);
  await page.locator('[data-view="all"]').first().click();
  await page.locator('#filtersButton').click();
  await page.locator('#timeFilter').selectOption('30');
  await page.locator('#categoryFilter').selectOption('면·파스타');
  assert.equal(await page.locator('.recipe-card').count(),1);
  await page.locator('#searchInput').fill('missing ingredient');
  assert.equal(await page.locator('.recipe-card').count(),0);
  await page.locator('#emptyClearButton').click();
  assert.equal(await page.locator('.recipe-card').count(),3);
  await page.locator('#sortFilter').selectOption('quickest');
  assert.match(await page.locator('.recipe-card').first().innerText(),/Korean/);
  await page.locator('[data-recipe-id="photo-one"]').first().click();
  await page.locator('#shareRecipeButton').click();
  assert.equal(await page.locator('#shareDialog').isVisible(),true);
  assert.match(await page.locator('#shareLink').inputValue(),/\?recipe=photo-one#feed$/);
  await page.locator('#copyShareLink').click();
  await page.waitForFunction(()=>document.querySelector('#shareMessage').textContent.trim().length>0);
  assert.match(await page.locator('#shareMessage').innerText(),/Link copied|link is selected/);
  await page.locator('[data-close-dialog="shareDialog"]').click();
  await page.locator('.ingredient-checklist input').check();
  assert.equal(await page.locator('.ingredient-checklist input').isChecked(),true);
  await page.locator('#cookModeButton').click();
  assert.equal(await page.locator('#detailDialog').evaluate(el=>el.classList.contains('cook-mode')),true);
  await page.locator('[data-close-dialog="detailDialog"]').click();
  await page.locator('#openComposer').click();
  await page.locator('#composerDialog').waitFor({state:'visible'});
  assert.equal(await page.locator('#authorName').inputValue(),'Test Chef');
  await page.locator('#composerNext').click();
  assert.match(await page.locator('#recipeMessage').innerText(),/title/);
  await page.locator('#recipeTitle').fill('My test recipe');
  await page.locator('#cookMinutes').fill('0');
  await page.locator('#composerNext').click();
  assert.match(await page.locator('#recipeMessage').innerText(),/600/);
  await page.locator('#cookMinutes').fill('20');
  await page.locator('#composerNext').click();
  await page.locator('[data-item]').fill('Tomatoes');
  await page.locator('[data-quantity]').fill('2 cups');
  await page.locator('#steps textarea').fill('Chop, cook and serve.');
  await page.locator('#composerNext').click();
  await page.locator('#imageFile').setInputFiles(path.join(root,'assets/recipe-book-logo.png'));
  assert.equal(await page.locator('#mediaPreview img').count(),1);
  await page.locator('[data-media-mode="video"]').click();
  assert.equal(await page.locator('#mediaPreview img').count(),0);
  await page.locator('#videoFile').setInputFiles({name:'test.webm',mimeType:'video/webm',buffer:Buffer.from('test-video')});
  assert.equal(await page.locator('#mediaPreview video').count(),1);
  await page.locator('[data-media-mode="none"]').click();
  assert.equal(await page.locator('#mediaPreview video').count(),0);
  await page.locator('#publishButton').click();
  await page.locator('#composerDialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('.recipe-card').count(),4);
  const inserted=await page.evaluate(()=>window.__recipeTest.recipes.find(x=>x.title==='My test recipe'));
  assert.equal(inserted.visibility,'published');assert.equal(inserted.image_url,null);assert.equal(inserted.video_url,null);
  assert.equal(await page.evaluate(()=>window.__recipeTest.uploads.length),0);
  // Backend failure must not leave an incomplete public recipe.
  await page.locator('#openComposer').click();
  await page.locator('#recipeTitle').fill('Failure test');
  await page.locator('#composerNext').click();
  await page.locator('[data-item]').fill('Basil');
  await page.locator('#steps textarea').fill('Tear the leaves.');
  await page.locator('#composerNext').click();
  await page.locator('#imageFile').setInputFiles(path.join(root,'assets/recipe-book-logo.png'));
  await page.evaluate(()=>window.__recipeTest.failChildren=true);
  await page.locator('#publishButton').click();
  await page.waitForFunction(()=>!document.querySelector('#publishButton').disabled);
  assert.equal(await page.evaluate(()=>window.__recipeTest.recipes.filter(x=>x.title==='Failure test').length),0);
  assert.equal(await page.evaluate(()=>window.__recipeTest.removals.length),1);
  assert.equal(await page.locator('#recipeTitle').inputValue(),'Failure test');
  await page.locator('[data-close-dialog="composerDialog"]').click();
  await page.locator('#profileButton').click();
  await page.locator('#profileName').fill('Taken');
  await page.locator('#profileForm button[type="submit"]').click();
  assert.match(await page.locator('#profileMessage').innerText(),/already taken/);
  await page.locator('[data-close-dialog="profileDialog"]').click();
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin,{waitUntil:'networkidle'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile page overflow');
  await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});
  await page.locator('.mobile-create').click();
  assert.equal(await page.locator('#composerDialog').isVisible(),true);
  assert.equal(await page.locator('#composerDialog').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'mobile dialog overflow');
  await page.screenshot({path:path.join(out,'mobile-composer.png'),fullPage:false});
  await page.locator('[data-close-dialog="composerDialog"]').click();
  await page.evaluate(()=>{window.__recipeTest.recipes=[];});
  await page.locator('[data-view="all"]').last().click();
  // Reload the feed via the actual error retry path.
  await page.route('**/supabase-js@2/+esm',route=>route.fulfill({contentType:'text/javascript',body:'window.__recipeTest.failFeed=true; export function createClient(){return window.__mockClient;}'}));
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#retryButton').isVisible(),true);
  await page.locator('.mobile-create').click();
  assert.equal(await page.locator('#composerDialog').isVisible(),true,'draft editor works while feed is offline');
  await page.locator('[data-close-dialog="composerDialog"]').click();
  await page.evaluate(()=>{window.__recipeTest.failFeed=false;window.__recipeTest.recipes=[];});
  await page.locator('#retryButton').click();
  assert.equal(await page.locator('.recipe-card').count(),0);
  assert.equal(await page.locator('#emptyState').isVisible(),true);
  assert.equal(await page.locator('#retryButton').isVisible(),false);
  await page.setViewportSize({width:1440,height:1050});
  await page.screenshot({path:path.join(out,'desktop-empty.png'),fullPage:true});
  assert.deepEqual(errors,[],'browser errors');
  console.log('PASS: English UI, combined filters, saved persistence, recipe details, cooking checks, 3-step validation, media mode cleanup, draft publishing/rollback, duplicate names, error retry, mobile layouts. Screenshots: '+out);
  await browser.close();server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1);});
