import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.MARGINALIA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true});
try {
  for(const mobile of [false,true]) {
    const page=await browser.newPage({viewport:mobile?{width:430,height:850}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(resolve('.preview/workspace.html')).href+(mobile?'?mobile':''));
    const before=await page.evaluate(()=>window.workspaceFixture.sources());
    // Reconcile an already-mounted World menu even when no explicit refresh was called.
    await page.evaluate(()=>window.workspaceFixture.mountStoryboard());
    const nav=page.getByRole('navigation',{name:'Marginalia navigation'});
    assert.deepEqual((await nav.getByRole('button').allTextContents()).slice(0,3),['Home','Project Register','Projects']);
    assert.equal(await nav.getByRole('button',{name:'Brainstorms',exact:true}).count(),0);
    assert.equal(await nav.getByRole('button',{name:'Canon',exact:true}).count(),0);
    assert.equal(await nav.getByRole('button',{name:'Script Studio',exact:true}).count(),0);
    assert.equal(await nav.getByRole('separator').count(),1);
    assert.equal(await nav.getByRole('separator').evaluate(e=>e.previousElementSibling.textContent),'Projects');
    assert.ok(await page.getByLabel('Vault files').isVisible());
    await nav.getByRole('button',{name:'Project Register',exact:true}).click();
    await page.getByRole('button',{name:'Choose Base…',exact:true}).click();
    const dialog=page.getByRole('dialog'),input=dialog.getByRole('combobox',{name:'Project Register Base file'});
    await input.fill('../Outside.base');await dialog.getByRole('button',{name:'Save',exact:true}).click();
    await dialog.getByRole('alert').filter({hasText:'Choose an existing'}).waitFor();
    assert.equal(await page.evaluate(()=>window.workspaceFixture.settings().projectRegisterBase),'');
    await input.fill('Registers/Projects');
    await page.getByRole('option',{name:'Registers/Projects.base',exact:true}).click();
    await dialog.getByRole('button',{name:'Save',exact:true}).click();
    await dialog.waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>window.workspaceFixture.settings().projectRegisterBase),'Registers/Projects.base');
    await page.getByRole('table',{name:'Project metadata'}).waitFor();
    assert.equal(await page.locator('#opened').textContent(),'');
    assert.equal(await page.getByLabel('Vault project summary').count(),1);
    for(const key of ['status','genre','tag','format'])assert.equal(await page.getByLabel('Filter by '+key).count(),1);
    await page.evaluate(()=>window.workspaceFixture.deleteBase());
    await nav.getByRole('button',{name:'Project Register',exact:true}).click();
    await page.getByText('The assigned Base is unavailable.',{exact:false}).waitFor();
    await page.getByRole('button',{name:'Choose Base…',exact:true}).click();
    await dialog.getByRole('combobox',{name:'Project Register Base file'}).fill('');
    await dialog.getByRole('button',{name:'Save',exact:true}).click();
    await dialog.waitFor({state:'detached'});
    assert.equal(await page.evaluate(()=>window.workspaceFixture.settings().projectRegisterBase),'');
    assert.deepEqual(await page.evaluate(()=>window.workspaceFixture.sources()),before);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:resolve('design/verification/storyboard-register-'+(mobile?'mobile':'desktop')+'-2026-11-01.png')});
    await page.close();
  }
  console.log('Storyboard menu, divider, native tree, Base assignment/validation, missing-file fallback, reset and unchanged notes pass on desktop/mobile.');
} finally {await browser.close();}
