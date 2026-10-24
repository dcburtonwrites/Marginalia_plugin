import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium,devices}=require(process.env.MARGINALIA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true});
const results=[];
const file=name=>pathToFileURL(resolve('.preview/'+name)).href;
try {
 for (const [name,device] of [['phone',devices['iPhone 13']],['android',devices['Pixel 7']],['tablet',devices['iPad Mini']]]) {
  const context=await browser.newContext({...device});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(file('workspace.html')+'?mobile');
  assert.equal(await page.evaluate(()=>window.innerWidth),device.viewport.width,'fixture must use the mobile layout viewport');
  // Model the native drawer shell; the tested page/nav components are production code.
  await page.addStyleTag({content:'.host{display:block} main{width:100%;height:100vh} aside{position:fixed;inset:0 auto 0 0;width:min(320px,100vw);z-index:9}body[data-drawer=closed] aside{display:none}#controls{display:none}'});
  const nav=page.getByRole('navigation',{name:'Marginalia navigation'});
  await nav.getByRole('button',{name:'Canon',exact:true}).tap();
  assert.equal(await page.locator('body').getAttribute('data-drawer'),'closed');
  await page.getByRole('tab',{name:'Character',exact:true}).tap();
  assert.match(await page.locator('.marginalia-entry-card').first().textContent(),/Mira/);
  const noOverflow=()=>page.locator('main').evaluate(el=>el.scrollWidth<=el.clientWidth+1);
  assert.ok(await noOverflow(),name+' Canon overflow');
  await page.evaluate(()=>document.body.dataset.drawer='open');
  await nav.getByRole('button',{name:'Home',exact:true}).tap();
  await page.getByRole('button',{name:'Edit pinned references'}).tap();
  await page.getByLabel('Pin a reference',{exact:true}).fill('Mira');
  await page.getByRole('option',{name:/Mira/}).tap();
  assert.ok(await page.locator('.marginalia-pin-row').count());
  await page.getByRole('button',{name:'Finish editing pinned references'}).tap();
  assert.ok(await noOverflow(),name+' Home overflow');
  await page.screenshot({path:resolve('design/verification/mobile-'+name+'-home.png')});
  await page.getByRole('button',{name:'New Entry',exact:true}).tap();
  const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Entry type',{exact:true}).selectOption('Canon');
  assert.ok(await dialog.getByLabel('Subtype',{exact:true}).isVisible());
  await dialog.getByRole('button',{name:'Cancel',exact:true}).tap();
  await page.goto(file('workspace.html')+'?mobile&storyboard');
  await page.getByRole('navigation').getByRole('button',{name:'Project Register',exact:true}).waitFor();
  await page.goto(file('scripts.html')+'?mobile&studio');
  await page.addStyleTag({content:'.host{display:block}.note{width:100%;height:100vh}.sidebar-host{position:fixed;inset:0 auto 0 0;width:min(320px,100vw);z-index:9}body[data-drawer=closed] .sidebar-host{display:none}.preview-label{display:none}'});
  await page.getByRole('combobox',{name:'Project or grouping'}).selectOption({label:'Copper Sky > Draft'});
  assert.equal(await page.locator('body').getAttribute('data-drawer'),'closed');
  await page.evaluate(()=>document.body.dataset.drawer='open');
  await page.getByRole('button',{name:'Expand or collapse Opening',exact:true}).tap();
  const script=page.locator('.marginalia-script-file').filter({has:page.getByRole('button',{name:'Opening',exact:true})});
  assert.equal(await script.getByRole('button',{name:'Expand or collapse Page 1',exact:true}).getAttribute('aria-expanded'),'false');
  await script.getByRole('button',{name:'Opening',exact:true}).tap();
  await page.getByLabel('Script editor').waitFor();
  const set=text=>page.evaluate(text=>window.mobileEditor.set(text),text);
  const enter=async(inputType='insertParagraph',extra={})=>{
    const before=await page.evaluate(()=>window.mobileEditor.text());
    await page.getByLabel('Script editor').evaluate((el,args)=>el.dispatchEvent(new InputEvent('beforeinput',{inputType:args.inputType,bubbles:true,cancelable:true,...args.extra})),{inputType,extra});
    if(name==='android' && ['insertParagraph','insertLineBreak'].includes(inputType) && !extra.isComposing && /\/[Ppdtc](?:[ntwdse])?$/.test(before))
      await page.waitForFunction(before=>window.mobileEditor.text()!==before,before);
  };
  await set('## Page 1\n\n/p');await enter();
  assert.equal(await page.evaluate(()=>window.mobileEditor.selected()),'New panel');
  assert.match(await page.evaluate(()=>window.mobileEditor.text()),/> \[!panel\]/);
  await page.evaluate(()=>window.mobileEditor.undo());
  assert.equal(await page.evaluate(()=>window.mobileEditor.text()),'## Page 1\n\n/p');
  await set('---\nCharacters: ["Mira"]\n---\n## Page 1\n\n/d');await enter('insertLineBreak');
  await page.getByRole('option',{name:'Mira',exact:true}).tap();
  assert.equal(await page.evaluate(()=>window.mobileEditor.selected()),'Dialogue');
  assert.match(await page.evaluate(()=>window.mobileEditor.text()),/\*\*Mira:\*\* Dialogue/);
  await page.screenshot({path:resolve('design/verification/mobile-'+name+'-editor.png')});
  for(const [cmd,match] of [['/P',/## Page 2/],['/t',/> \[!quote\]/],['/c',/> \[!note\]/],['/cn',/> \[!note\]/],['/ct',/> \[!tip\]/],['/cw',/> \[!warning\]/],['/cd',/> \[!danger\]/],['/cs',/> \[!success\]/],['/ce',/> \[!example\]/]]) {
    await set('## Page 1\n\n'+cmd);await enter();assert.match(await page.evaluate(()=>window.mobileEditor.text()),match);
  }
  for(const inputType of ['insertText','insertFromPaste','insertCompositionText']) {
    const text='## Page 1\n\n/p';await set(text);await enter(inputType);assert.equal(await page.evaluate(()=>window.mobileEditor.text()),text);
  }
  await set('## Page 1\n\n/p');await page.getByLabel('Script editor').press('Enter');
  await page.waitForFunction(()=>window.mobileEditor.selected()==='New panel');
  assert.equal(await page.evaluate(()=>window.mobileEditor.selected()),'New panel');
  await set('A normal line');await enter();
  assert.equal(await page.evaluate(()=>window.mobileEditor.text()),'A normal line');
  await set('## Page 1\n\n/p');
  await page.getByLabel('Script editor').evaluate(el=>el.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true})));
  await enter('insertParagraph',{isComposing:true});
  assert.equal(await page.evaluate(()=>window.mobileEditor.text()),'## Page 1\n\n/p');
  assert.deepEqual(errors,[]);
  results.push({profile:name,engine:'Chromium',touch:true,navigation:'pass',pageFit:'pass',worldAndStoryboard:'pass',touchReferencePicker:'pass',scriptDisclosureAndNavigation:'pass',softKeyboardShortcutEvents:'pass',dialogueTouchAndFocus:'pass',undoAndComposition:'pass',physicalDevice:false});
  await context.close();
 }
 await writeFile('docs/verification/mobile-ui.json',JSON.stringify({results,limits:'Browser device emulation and synthetic soft-keyboard events; not native iOS/Android acceptance.'},null,2)+'\n');
 console.log('Mobile UI checks passed for phone, Android and tablet browser profiles.');
} finally {await browser.close();}
