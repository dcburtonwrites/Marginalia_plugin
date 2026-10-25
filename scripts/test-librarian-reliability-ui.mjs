import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.MARGINALIA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(resolve('.preview/index.html')).href+'?reliability');
 await page.getByText('This project',{exact:true}).waitFor();
 await page.getByRole('textbox',{name:'Ask the Librarian',exact:true}).fill('Who owns the archive?');
 await page.getByRole('button',{name:'Send',exact:true}).click();
 await page.getByText(/This answer may be incomplete:/).waitFor();
 assert.ok(await page.getByText(/unverified source reference/).isVisible());
 assert.ok(await page.getByText(/2 source passages did not fit/).isVisible());
 const content=await page.locator('.marginalia-message.is-assistant .marginalia-markdown').textContent();
 assert.ok(!content.includes('[[Unknown note]]'));
 const link=page.locator('.marginalia-message.is-assistant a.internal-link');assert.equal(await link.count(),1);
 assert.equal(await link.getAttribute('data-href'),'01 Lore/Eastern Archive');await link.click();
 await page.getByText('Opened original: 01 Lore/Eastern Archive',{exact:true}).waitFor();
 await page.getByRole('button',{name:'New chat',exact:true}).click();
 assert.equal(await page.locator('.marginalia-answer-warning').count(),0);
 assert.deepEqual(errors,[]);console.log('Librarian UI: project label, citation repair, unfinished/omitted evidence notices and New chat cleanup passed.');
}finally{await browser.close();}
