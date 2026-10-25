import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.MARGINALIA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(resolve('.preview/scripts.html')).href+'?studio');
 const result=await page.evaluate(()=>{
  const {parseScript,numberRenderedScript,restoreNumbering}=window.numberingTestApi;
  const root=document.createElement('div');
  root.innerHTML='<h2>Page 99 — <a href="#">Door</a></h2><div class="callout" data-callout="panel"><div class="callout-title"><span class="callout-title-inner"><em>Same name</em></span></div></div><div class="callout" data-callout="panel"><div class="callout-title"><span class="callout-title-inner">Same name</span></div></div><h2>Page 99 Double Spread — Wide</h2><div class="callout" data-callout="panel"><div class="callout-title">Panel 44 — Wide panel</div></div>';
  document.body.append(root);
  const text='## Page 99 — Door\n> [!panel] Same name\n> A\n> [!panel] Same name\n> B\n## Page 99 Double Spread — Wide\n> [!panel] Panel 44 — Wide panel\n> C\n';
  const script=parseScript({path:'Story/Scripts/Test.md',text,metadata:{Pages:99}});
  const original=root.innerHTML,link=root.querySelector('a'); let clicks=0;
  link.addEventListener('click',e=>{e.preventDefault();clicks++;});
  numberRenderedScript(root,script);
  const first=[...root.querySelectorAll('h2, .callout-title-inner')].map(n=>n.textContent);
  numberRenderedScript(root,script);
  const idempotent=root.querySelectorAll('h2')[0].textContent==='Page 1 — Door';
  link.click();
  const retainedLink=link===root.querySelector('a')&&clicks===1&&!!root.querySelector('em');
  // Same rendered heading node gets a shifted source line after a middle insertion.
  const heading=root.querySelectorAll('h2')[1];
  const shifted=parseScript({path:script.path,text:text.replace('## Page 99 Double','## Page ?\n\n## Page 99 Double'),metadata:{}});
  numberRenderedScript(heading,shifted,()=>({lineStart:7,lineEnd:7}));
  const shiftedHeading=heading.textContent;
  restoreNumbering(root);
  const restored=root.querySelector('h2').textContent==='Page 99 — Door'&&link===root.querySelector('a');
  return {first,idempotent,retainedLink,shiftedHeading,restored};
 });
 assert.deepEqual(result.first,['Page 1 — Door','Panel 1 — Same name','Panel 2 — Same name','Page 2–3 — Wide']);
 assert.equal(result.shiftedHeading,'Page 3–4 — Wide');
 assert.ok(result.idempotent&&result.retainedLink&&result.restored);
 assert.deepEqual(errors,[]);
 console.log('Numbering DOM checks passed: duplicate names, spreads, reused sections, inline links/emphasis, idempotence and restoration.');
} finally {await browser.close();}
