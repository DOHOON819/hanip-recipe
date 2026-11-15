// Explicit opt-in. Uses an isolated community tag, never the public recipe feed.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');const root=path.resolve(__dirname,'..');
let browser,author,reader,recipe,comment,media;
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,d)=>e?res.writeHead(404).end():res.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'}).end(d));});
(async()=>{
 if(process.env.RECIPE_BOOK_LIVE!=='1')throw new Error('Set RECIPE_BOOK_LIVE=1 to test public infrastructure in a separate test namespace.');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,tag='recipe-story-qa-'+Date.now();
 browser=await chromium.launch({headless:true,executablePath:process.env.RECIPE_BOOK_BROWSER});
 async function page(){const c=await browser.newContext();const p=await c.newPage();await p.goto(origin,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.HANIP_CONFIG);await p.evaluate(async tag=>{window.qa=(await import('./community-backend.js?v=20261115-shorts-v1')).createCommunityBackend({...window.HANIP_CONFIG,communityTag:tag});},tag);return p;}
 author=await page();reader=await page();console.log('Connected two independent visitors to the configured public relays.');
 media=await author.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=240;canvas.height=320;const ctx=canvas.getContext('2d');const stream=canvas.captureStream(10),recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();let n=0;const timer=setInterval(()=>{ctx.fillStyle=n++%2?'#c7dca2':'#f4efdf';ctx.fillRect(0,0,240,320);ctx.fillStyle='#304421';ctx.font='18px sans-serif';ctx.fillText('Temporary video check',12,160);},100);await new Promise(r=>setTimeout(r,1400));await new Promise(r=>{recorder.onstop=r;recorder.stop();});clearInterval(timer);stream.getTracks().forEach(t=>t.stop());return qa.upload(new File(chunks,'temporary-recipe-check.webm',{type:'video/webm'}),'video');
 }); console.log('Video uploaded:',media.url);
 recipe=await author.evaluate(async media=>qa.publishRecipe({author_name:'Temporary QA',title:'Temporary isolated playback check',description:'This temporary verification post is in an isolated test namespace and will be deleted.',cuisine:'Australian',category:'호주식',difficulty:'쉬움',cook_minutes:1,servings:1,recipe_ingredients:[{item:'Connection',quantity:'1'}],recipe_steps:['Verify playback and shared interactions, then remove this test.'],media:{video:media}}),media);
 let received;for(let i=0;i<3;i++){received=await reader.evaluate(id=>qa.loadRecipe(id),recipe.id);if(received)break;}
 assert.equal(received?.title,'Temporary isolated playback check');console.log('Exact-id shared recipe loaded in a fresh visitor.');
 const playback=await reader.evaluate(async source=>{const video=document.createElement('video');video.muted=true;video.playsInline=true;video.src=source;document.body.append(video);await video.play();await new Promise(r=>setTimeout(r,650));const result={time:video.currentTime,ready:video.readyState,width:video.videoWidth,error:video.error?.message||null};video.pause();video.remove();return result;},media.url);assert.ok(playback.time>.1&&playback.ready>=2&&playback.width>0);console.log('Remote media decoded and played:',JSON.stringify(playback));
 await reader.evaluate(id=>qa.react(id,{heart:true,vote:1}),recipe.id);
 comment=await reader.evaluate(id=>qa.addComment(id,'Temporary comment, checking cross-visitor delivery.','Temporary visitor'),recipe.id);
 let social;for(let i=0;i<3;i++){social=await author.evaluate(id=>qa.loadSocial(id),recipe.id);if(social.hearts===1&&social.comments.some(c=>c.id===comment.id))break;}
 assert.equal(social.hearts,1);assert.equal(social.likes,1);assert.ok(social.comments.some(c=>c.id===comment.id));console.log('Public hearts, likes and comments visible to the other visitor.');
 await reader.evaluate(id=>qa.react(id,{heart:true,vote:-1}),recipe.id);
 social=await author.evaluate(id=>qa.loadSocial(id),recipe.id);assert.equal(social.likes,0);assert.equal(social.dislikes,1);
 console.log('PASS: live media upload/playback, exact-id cross-visitor sharing, hearts, like-to-dislike replacement and public comments.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
 try {
   if(comment&&reader){await reader.evaluate(async({id,c})=>qa.deleteComment(id,{id:c.id,author_id:qa.session().user.id}),{id:recipe.id,c:comment});const social=await author.evaluate(id=>qa.loadSocial(id),recipe.id);assert.ok(!social.comments.some(c=>c.id===comment.id),'comment removal visible to other visitor');}
   if(recipe&&author){const loaded=await author.evaluate(id=>qa.loadRecipe(id),recipe.id);if(loaded)await author.evaluate(r=>qa.deleteRecipe(r),loaded);assert.equal(await reader.evaluate(id=>qa.loadRecipe(id),recipe.id),null,'deleted recipe must not open from a share link');}
   else if(media&&author)await author.evaluate(m=>qa.removeUpload(m),media);
   console.log('Temporary comment and recipe deletion verified from the other visitor.');
 }catch(e){console.error('Cleanup needs attention:',e.message);process.exitCode=1;}
 await browser?.close();server.close();
});
