import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const logs = [];
page.on('console', (msg) => logs.push(`[console.${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));
page.on('response', (r) => {
  if (r.url().includes('/api/')) logs.push(`[api] ${r.status()} ${r.url()}`);
});

await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

await page.locator('input[type="email"], input[name="email"]').first().fill('test@canfly.org');
await page.locator('button[type="submit"]').first().click();
await page.waitForTimeout(5000);

// Read body for code
const body = await page.locator('body').textContent();
const codeMatch = body?.match(/Код:\s*(\d{8})/);
console.log('Code from UI:', codeMatch?.[1]);

const allButtons = await page.locator('button').all();
console.log('buttons:', allButtons.length);
for (let i=0;i<allButtons.length;i++) {
  const t = (await allButtons[i].textContent())?.trim();
  const visible = await allButtons[i].isVisible().catch(()=>false);
  console.log(`  btn[${i}] visible=${visible} text="${t?.slice(0,80)}"`);
}

// Click "Ввести код вручную" if exists
const manual = page.getByText('Ввести код вручную', { exact: false });
if (await manual.count()) {
  await manual.first().click();
  await page.waitForTimeout(800);
}

const allInputs = await page.locator('input').all();
console.log('inputs after manual:', allInputs.length);
for (let i = 0; i < allInputs.length; i++) {
  const t = await allInputs[i].getAttribute('type').catch(()=>null);
  const ph = await allInputs[i].getAttribute('placeholder').catch(()=>null);
  const name = await allInputs[i].getAttribute('name').catch(()=>null);
  const ml = await allInputs[i].getAttribute('maxlength').catch(()=>null);
  console.log(`  inp[${i}] type=${t} ph=${ph} name=${name} maxlen=${ml}`);
}

const code = codeMatch?.[1] ?? '00000000';
let ci = 0;
for (const inp of allInputs) {
  const type = await inp.getAttribute('type').catch(()=>null);
  if (type === 'email' || type === 'hidden') continue;
  const visible = await inp.isVisible().catch(()=>false);
  if (!visible) continue;
  if (ci < code.length) {
    await inp.fill(code[ci]);
    ci++;
  }
}
console.log('filled:', ci);

await page.waitForTimeout(300);
const submitBtn = page.locator('button[type="submit"]').last();
await submitBtn.click();
await page.waitForTimeout(10000);

console.log('URL:', page.url());
console.log('BODY snippet:', (await page.locator('body').textContent())?.slice(0, 600));
console.log('--- logs ---');
console.log(logs.join('\n'));

await page.screenshot({ path: '/tmp/orbital-test/after-login.png', fullPage: true });
await browser.close();
