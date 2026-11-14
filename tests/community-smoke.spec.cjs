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
  const page = await browser.newPage(); const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil:'domcontentloaded', timeout:30000 });
  try { await page.waitForFunction(() => document.querySelector('#recipeGrid')?.getAttribute('aria-busy') === 'false', null, { timeout:25000 }); }
  catch (error) { console.error('Browser errors:', errors); console.error('Page:', (await page.locator('body').innerText()).slice(0, 1500)); throw error; }
  assert.equal(await page.locator('#retryButton').isVisible(), false, 'community feed should be reachable');
  assert.deepEqual(errors.filter((message) => !/favicon/i.test(message)), []);
  console.log(`PASS: live community feed reachable — ${await page.locator('#feedStatus').innerText()}`);
  await browser.close(); server.close();
})().catch((error) => { console.error(error); server.close(); process.exit(1); });
