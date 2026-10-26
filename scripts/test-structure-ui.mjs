import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.MARGINALIA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true});
const url=pathToFileURL(resolve('.preview/scripts.html')).href+'?structure';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(url);
 await page.getByRole('combobox',{name:'Project or grouping'}).selectOption({label:'Copper Sky > Draft'});
 await page.getByRole('button',{name:'Expand or collapse Opening',exact:true}).click();
 const file=page.locator('.marginalia-script-file').first();
 const original=await page.evaluate(()=>window.outlineTest.files[0].text);
 const pages=file.locator('.marginalia-script-page');
 await pages.nth(2).locator(':scope > .marginalia-outline-row .marginalia-outline-name').dragTo(pages.first().locator(':scope > .marginalia-outline-row .marginalia-outline-name'),{targetPosition:{x:15,y:2}});
 await page.waitForFunction(()=>window.outlineTest.files[0].text.indexOf('## Page 4')<window.outlineTest.files[0].text.indexOf('## Page 1'));
 assert.equal(await pages.first().locator('.marginalia-outline-name').first().textContent(),'Page 1');
 await page.evaluate(()=>window.mobileEditor.undo());
 await page.waitForFunction(expected=>window.outlineTest.files[0].text===expected,original);
 // Escape cancels a drag, and page drops onto another script cannot edit either file.
 let fromRect=await pages.nth(2).locator(':scope > .marginalia-outline-row').boundingBox();
 let toRect=await pages.first().locator(':scope > .marginalia-outline-row').boundingBox();
 await page.mouse.move(fromRect.x+50,fromRect.y+10);await page.mouse.down();
 await page.mouse.move(toRect.x+50,toRect.y+2,{steps:5});await page.keyboard.press('Escape');await page.mouse.up();
 assert.equal(await page.evaluate(()=>window.outlineTest.files[0].text),original);
 await pages.nth(2).locator(':scope > .marginalia-outline-row .marginalia-outline-name').dragTo(page.locator('.marginalia-script-file').nth(1).locator(':scope > .marginalia-outline-row .marginalia-outline-name'));
 assert.equal(await page.evaluate(()=>window.outlineTest.files[0].text),original);
 await pages.first().locator('.marginalia-outline-arrow').first().click();
 const panel=file.getByRole('button',{name:'Panel 1 — The arrival',exact:true});
 await panel.dragTo(pages.nth(2).locator(':scope > .marginalia-outline-row .marginalia-outline-name'),{targetPosition:{x:15,y:2}});
 await page.waitForFunction(()=>window.outlineTest.view.currentScripts.get(window.outlineTest.files[0].path).pages[2].panels.length===2);
 const moved=await page.evaluate(()=>window.outlineTest.files[0].text);
 assert.ok(moved.indexOf('**MIRA:** Is anyone here?')>moved.indexOf('## Page 4'),'dialogue travels with panel');
 await page.evaluate(()=>window.mobileEditor.undo());
 await page.waitForFunction(expected=>window.outlineTest.files[0].text===expected,original);
 // Typing only changes evidence/offsets, preserving the outline DOM and fresh navigation/drop payloads.
 await page.evaluate(()=>{window.savedOutline=document.querySelector('.marginalia-script-file');window.mobileEditor.set(window.mobileEditor.text()+'\nExtra description.');});
 await page.waitForFunction(()=>window.outlineTest.view.currentScripts.get(window.outlineTest.files[0].path).text.endsWith('Extra description.'));
 assert.equal(await page.evaluate(()=>window.savedOutline===document.querySelector('.marginalia-script-file')),true);
 // Project readers preserve unchanged articles, including when another project changes.
 await page.getByRole('combobox',{name:'Project or grouping'}).selectOption({label:'Copper Sky > Draft'});
 await page.waitForSelector('main .marginalia-project-script');
 await page.evaluate(async()=>{window.savedArticle=document.querySelector('main .marginalia-project-script');const api=window.outlineTest;api.files[2].text+='\nOther project edit.';await api.mainView.draw();});
 assert.equal(await page.evaluate(()=>window.savedArticle===document.querySelector('main .marginalia-project-script')),true);
 await page.evaluate(async()=>{const api=window.outlineTest;api.files[1].text+='\nSame project second script edit.';await api.mainView.draw();});
 assert.equal(await page.evaluate(()=>window.savedArticle===document.querySelector('main .marginalia-project-script')),true);
 assert.match(await page.locator('main').textContent(),/Same project second script edit/);
 assert.equal(await page.getByRole('button',{name:/Move (page|panel) (up|down)/i}).count(),0);
 // The same guarded move path is reached by a deliberate touch long-press.
 const touchPage=await browser.newPage({viewport:{width:1000,height:1000},hasTouch:true,isMobile:true});
 await touchPage.goto(url+'&mobile');
 await touchPage.getByRole('combobox',{name:'Project or grouping'}).selectOption({label:'Copper Sky > Draft'});
 await touchPage.getByRole('button',{name:'Expand or collapse Opening',exact:true}).click();
 const touchMoved=await touchPage.evaluate(async()=>{
  const rows=[...document.querySelector('.marginalia-script-file').querySelectorAll('.marginalia-script-page > .marginalia-outline-row')];
  const from=rows[2].getBoundingClientRect(),to=rows[0].getBoundingClientRect(),node=rows[2];
  const make=(x,y)=>new Touch({identifier:1,target:node,clientX:x,clientY:y});
  node.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[make(from.left+40,from.top+10)]}));
  await new Promise(resolve=>setTimeout(resolve,480));
  document.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[make(to.left+40,to.top+2)]}));
  document.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[]}));
  await new Promise(resolve=>setTimeout(resolve,60));
  const text=window.outlineTest.files[0].text;
  return text.indexOf('## Page 4')<text.indexOf('## Page 1');
 });
 assert.equal(touchMoved,true);await touchPage.close();
 assert.deepEqual(errors,[]);
 console.log('Sidebar page drag, cross-page panel content, real CodeMirror single-step Undo, fresh offsets, unchanged outline DOM and reader article reuse and touch long-press passed.');
}finally{await browser.close();}
