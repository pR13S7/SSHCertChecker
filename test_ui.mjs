import { chromium } from 'playwright';

const pem = await (await import('fs')).promises.readFile('examples/dummy-cert.pem', 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1900, height: 1200 } });
await page.goto('http://127.0.0.1:8765/');
await page.fill('#pem-input', pem);
await page.click('#parse-btn');
await page.waitForTimeout(1000);

const colSubject = await page.locator('#col-subject').innerHTML();
const colSubjectText = await page.locator('#col-subject').innerText();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

console.log('col-subject innerHTML length:', colSubject.length);
console.log('col-subject text:', colSubjectText.slice(0, 200));
console.log('errors:', errors);
await page.screenshot({ path: '/tmp/cert-ui-test.png' });
await browser.close();
