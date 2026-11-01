import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.MARGINALIA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true});
try {
 for (const mobile of [false,true]) {
  const context=await browser.newContext({viewport:mobile?{width:430,height:850}:{width:1280,height:900}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto(pathToFileURL(resolve('.preview/scripts.html')).href+'?editor&studio'+(mobile?'&mobile':''));
  await page.getByRole('combobox',{name:'Project or grouping'}).selectOption({label:'Copper Sky > Draft'});
  await page.locator('#sidebar').getByRole('button',{name:'Opening',exact:true}).click();
  await page.addStyleTag({content:'.note{height:100vh;overflow:hidden}.cm-editor{height:75vh}.cm-scroller{overflow:auto}'});
  await page.evaluate(()=>{
    const content=document.querySelector('.cm-content'),scroller=content.parentElement;
    const metadata=document.createElement('div');metadata.className='metadata-container';metadata.textContent='Properties';metadata.style.height='88px';
    scroller.style.display='block';scroller.insertBefore(metadata,content);
  });
  await page.getByRole('button',{name:'Writing settings',exact:true}).click();
  await page.getByLabel('Focused writing',{exact:true}).check();
  await page.getByRole('button',{name:'Close settings'}).click();
  const text='## Page 1\n\n'+Array.from({length:100},(_,i)=>`Paragraph ${i}: A courier walks to the gate.\n\n`).join('');
  await page.evaluate(text=>window.mobileEditor.set(text),text);
  const centered=async label=>{
    await page.waitForFunction(()=>{const m=window.mobileEditor.metrics();return m.caret!==null&&Math.abs(m.caret-m.target)<5;});
    const m=await page.evaluate(()=>window.mobileEditor.metrics());
    assert.ok(Math.abs(m.caret-m.target)<5,`${mobile?'mobile':'desktop'} ${label}: ${JSON.stringify(m)}`);
  };
  await centered('last line');
  await page.evaluate(()=>window.mobileEditor.cursor(0));
  await centered('first line');
  const gap=await page.evaluate(()=>{const properties=document.querySelector('.metadata-container').getBoundingClientRect(),content=document.querySelector('.cm-content').getBoundingClientRect();return content.top-properties.bottom;});
  assert.ok(gap<30,'typewriter spacing must stay above Properties, not between Properties and content: '+gap);
  await page.evaluate(text=>window.mobileEditor.cursor(text.indexOf('Paragraph 50')),text);
  await centered('middle line');
  await page.keyboard.type('Typing here ');
  await centered('typing');
  await page.setViewportSize(mobile?{width:430,height:480}:{width:1280,height:700});
  await centered('resized visible editor');
  await page.screenshot({path:resolve(`design/verification/focus-scroll-${mobile?'mobile':'desktop'}.png`)});
  await page.getByRole('button',{name:'Writing settings',exact:true}).click();
  await page.getByLabel('Focused writing',{exact:true}).uncheck();
  assert.equal(await page.locator('.marginalia-writing-focus').count(),0);
  assert.equal(await page.locator('.cm-editor').evaluate(el=>el.style.getPropertyValue('--marginalia-focus-bottom')),'');
  assert.deepEqual(errors,[]);
  await context.close();
 }
 console.log('Focus scroll passed: desktop center, mobile upper third, first/middle/last lines, typing, resize and disable cleanup.');
} finally {await browser.close();}
