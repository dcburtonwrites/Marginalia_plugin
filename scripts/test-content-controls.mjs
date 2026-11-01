import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.MARGINALIA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true});
try{
 for(const mobile of [false,true]){
  console.log("Checking",mobile?"mobile":"desktop");
  const page=await browser.newPage({viewport:mobile?{width:430,height:850}:{width:1280,height:900},hasTouch:mobile,isMobile:mobile});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(resolve('.preview/scripts.html')).href+'?studio&editor'+(mobile?'&mobile':''));
  await page.getByRole('combobox',{name:'Project or grouping'}).selectOption({label:'Copper Sky > Draft'});
  await page.locator('#sidebar').getByRole('button',{name:'Opening',exact:true}).click();
  const text='---\nTitle: Display test\n---\n## Page 1\n\n> [!panel] Door\n> A door opens.\n\n**MIRA:** Come inside.\n\n> [!note] Note\n> Keep this detail.\n\n## Page 2\n\nVisible ending.\n';
  await page.evaluate(text=>window.mobileEditor.set(text),text);
  const menu=page.locator('.marginalia-content-controls');await menu.waitFor();
  assert.equal(await page.getByText('View options',{exact:true}).count(),0);
  if(mobile)await menu.locator('summary').tap();else await menu.locator('summary').hover();
  const heading=menu.locator('.marginalia-content-menu-title');
  const headingBox=await heading.boundingBox(), panelBox=await menu.locator('.marginalia-content-menu').boundingBox();
  assert.ok(headingBox.y>panelBox.y && headingBox.y+headingBox.height<panelBox.y+panelBox.height,'heading is inside the menu border');
  await page.getByLabel('Panel descriptions',{exact:true}).uncheck();
  await page.getByLabel('Callouts and notes',{exact:true}).uncheck();
  await page.getByLabel('Dialogue',{exact:true}).uncheck();
  await page.waitForFunction(()=>!document.querySelector('.cm-content').textContent.includes('Come inside.'));
  const visible=await page.locator('.cm-content').textContent();
  assert.ok(!visible.includes('A door opens.'));assert.ok(!visible.includes('Keep this detail.'));assert.ok(visible.includes('[!panel] Door'));
  assert.equal(await page.evaluate(()=>window.mobileEditor.text()),text);
  // Navigating into concealed content must reveal it for editing, never leave a hidden caret.
  await page.evaluate(text=>window.mobileEditor.cursor(text.indexOf('Come inside.')),text);
  await page.waitForFunction(()=>document.querySelector('.cm-content').textContent.includes('Come inside.'));
  if(mobile)await menu.locator('summary').tap();else await menu.locator('summary').hover();
  await page.getByLabel('Panel descriptions',{exact:true}).check();await page.getByLabel('Callouts and notes',{exact:true}).check();await page.getByLabel('Dialogue',{exact:true}).check();
  assert.equal(await page.evaluate(()=>window.mobileEditor.text()),text);
  if(!mobile){await page.mouse.move(2,2);assert.equal(await menu.getAttribute('open'),null,'hover menu closes when pointer leaves, including after choosing a checkbox');await menu.locator('summary').hover();}
  assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve('design/verification/content-controls-'+(mobile?'mobile':'desktop')+'.png')});
  await page.evaluate(()=>window.mobileEditor.destroy());assert.equal(await menu.count(),0);
  await page.close();
 }
 console.log('Floating content menu: desktop hover/mobile tap, independent visibility, titles/source preservation, active-passage reveal and restoration passed.');
}finally{await browser.close();}
