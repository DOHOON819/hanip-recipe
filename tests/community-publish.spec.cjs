const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.RECIPE_BOOK_PLAYWRIGHT || 'playwright');
const root = path.resolve(process.env.RECIPE_BOOK_ROOT || path.resolve(__dirname, '..'));
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => { if (error) response.writeHead(404).end(); else { response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); response.end(data); } });
});

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless:true, executablePath:process.env.RECIPE_BOOK_BROWSER });
  const page = await browser.newPage({ viewport:{ width:1280, height:900 } }); const stamp = Date.now(); const diagnostics = []; const mediaKind = process.env.RECIPE_BOOK_MEDIA || 'photo';
  page.on('console', (message) => { if (message.type() === 'error') diagnostics.push(message.text()); });
  page.on('requestfailed', (request) => diagnostics.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText}`));
  const title = `Recipe Story ${mediaKind} check ${stamp}`; const name = `Test Kitchen ${stamp}`;
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => document.querySelector('#recipeGrid')?.getAttribute('aria-busy') === 'false', null, { timeout:25000 });
  await page.locator('#openComposer').click();
  await page.locator('#authorName').fill(name); await page.locator('#recipeTitle').fill(title); await page.locator('#recipeDescription').fill('Temporary end-to-end check. Removed automatically.');
  await page.locator('#recipeCategory').selectOption('간편식'); await page.locator('#cookMinutes').fill('5'); await page.locator('#servings').fill('1');
  await page.locator('#recipeCuisine').selectOption('Other cuisine'); await page.locator('#difficulty').selectOption('쉬움');
  await page.locator('#composerNext').click(); await page.locator('[data-item]').fill('A working connection'); await page.locator('[data-quantity]').fill('1'); await page.locator('#steps textarea').fill('Publish, share, verify and remove.');
  await page.locator('#composerNext').click();
  if (mediaKind === 'video') {
    const bytes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180; const context = canvas.getContext('2d'); const stream = canvas.captureStream(12);
      const recorder = new MediaRecorder(stream, { mimeType:'video/webm' }); const chunks = []; recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.start(); context.fillStyle = '#173f35'; context.fillRect(0, 0, 320, 180); context.fillStyle = '#f7f3e8'; context.font = 'bold 34px sans-serif'; context.fillText('Recipe Story', 45, 98);
      await new Promise((resolve) => setTimeout(resolve, 650)); const stopped = new Promise((resolve) => { recorder.onstop = resolve; }); recorder.stop(); await stopped;
      return [...new Uint8Array(await new Blob(chunks, { type:'video/webm' }).arrayBuffer())];
    });
    await page.locator('[data-media-mode="video"]').click(); await page.locator('#videoFile').setInputFiles({ name:'recipe-book-check.webm', mimeType:'video/webm', buffer:Buffer.from(bytes) }); await page.locator('#mediaPreview video').waitFor();
  } else await page.locator('#imageFile').setInputFiles(path.join(root, 'assets', 'recipe-book-logo.png'));
  await page.locator('#publishButton').click();
  try {
    await Promise.race([
      page.locator('#composerDialog').waitFor({ state:'hidden', timeout:60000 }),
      page.waitForFunction(() => document.querySelector('#recipeMessage')?.textContent.trim().length > 0 && document.querySelector('#composerDialog')?.getAttribute('aria-busy') === 'false', null, { timeout:60000 }).then(() => { throw new Error('Publication failed.'); })
    ]);
  } catch (error) { console.error('Publication message:', await page.locator('#recipeMessage').innerText()); console.error('Diagnostics:', diagnostics); throw error; }
  const card = page.locator('.recipe-card', { hasText:title }); await card.waitFor({ timeout:30000 });
  await card.locator('[data-recipe-id]').first().click(); await page.locator('#shareRecipeButton').click();
  const shareUrl = await page.locator('#shareLink').inputValue(); assert.match(shareUrl, /\?recipe=[0-9a-f]{64}#feed$/);
  const visitorContext = await browser.newContext({ viewport:{ width:390, height:844 } }); const visitor = await visitorContext.newPage();
  await visitor.goto(shareUrl, { waitUntil:'domcontentloaded', timeout:30000 }); await visitor.locator('#detailDialog[open]').waitFor({ timeout:30000 });
  assert.equal(await visitor.locator('#detailTitle').innerText(), title, 'shared recipe should open for another visitor'); await visitorContext.close();
  await page.locator('[data-close-dialog="shareDialog"]').click(); await page.locator('.delete-recipe').click();
  await page.waitForFunction((value) => ![...document.querySelectorAll('.recipe-card')].some((card) => card.textContent.includes(value)), title, { timeout:30000 });
  console.log(`PASS: live ${mediaKind} publish, shared deep link and creator-only delete — ${shareUrl}`);
  await browser.close(); server.close();
})().catch((error) => { console.error(error); server.close(); process.exit(1); });
