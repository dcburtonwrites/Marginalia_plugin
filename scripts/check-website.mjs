import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('website/dist');
const pages=['index.html','guide.html','install.html'];
const source=new Map(await Promise.all(pages.map(async name=>[name,await readFile(resolve(root,name),'utf8')])));
let links=0;
for(const [name,html] of source){
  assert(html.includes('<html lang="en">')&&html.includes('name="viewport"'),name+': document metadata');
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,name+': one main heading');
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1,name+': current navigation');
  for(const [,raw] of html.matchAll(/(?:src|href|action)="([^"]+)"/g)){
    const url=raw.replaceAll('&amp;','&');
    if(/^(https?:|mailto:|obsidian:)/.test(url))continue;
    const [route,hash]=url.split('#');
    const file=route.split('?')[0];
    const path=resolve(root,dirname(name),file||name);
    assert(!relative(root,path).startsWith('..'),'Path escapes website: '+url);
    assert((await stat(path)).isFile(),'Missing local file: '+url);
    if(hash){const target=await readFile(path,'utf8');assert(target.includes(`id="${hash}"`),'Missing anchor: '+url);}
    links++;
  }
}
const config=await readFile(resolve(root,'config.js'),'utf8');
const manifest=JSON.parse(await readFile('manifest.json','utf8'));
assert(config.includes(`version: "${manifest.version}"`),'Site/release version mismatch');
assert(config.includes(manifest.fundingUrl),'Donation destination mismatch');
assert(!source.get('install.html').includes('obsidian://show-plugin'),'Direct installation must not require a directory listing');
assert(source.get('install.html').includes('https://github.com/dcburtonwrites/Marginalia_plugin/releases'),'GitHub installation route');
assert(config.includes('https://formsubmit.co/9eeaaf0d470462936e90ceea915e72b6'),'Recipient endpoint');
assert(source.get('install.html').includes('type="email"')&&source.get('install.html').includes('name="consent"'),'Form validation and consent');
const script=await readFile(resolve(root,'site.js'),'utf8');
assert(script.includes('Preview only:')&&script.includes('location.protocol==="file:"'),'No local-preview email sends');
assert(script.includes('form.submit()')&&script.includes('form.action=config.requestEndpoint'),'Standard provider verification navigation');
assert(!script.includes('fetch('),'No background request that depends on provider CORS');
const files=await readdir(root);
assert.equal(files.filter(name=>name.endsWith('.html')).length,3,'Three pages');
console.log(`Website check passed: three pages, ${links} local links/assets/anchors, release version, donation destination and form guards.`);

// Exercise production form guards/navigation; never submit to the network.
const {runInNewContext}=await import('node:vm');
async function submitScenario({hostname='example.test',protocol='https:',valid=true,honey='',enabled=true,fail=false}={}){
 let handler,pageshow,called=0;
 const fields=new Map();
 const status={textContent:'',classList:{remove(){},add(){}}};
 const submit={disabled:false,textContent:'Send request'};
 const form={querySelector(selector){if(selector==='button[type=submit]')return submit;return fields.get(selector.match(/name="([^"]+)"/)[1]);},reportValidity:()=>valid,appendChild(input){fields.set(input.name,input);},addEventListener(_event,fn){handler=fn;},submit(){called++;if(fail)throw new Error('Navigation failed');}};
 const preview={hidden:true};
 runInNewContext(script,{
  window:{MARGINALIA:{requestsEnabled:enabled,requestEndpoint:'https://formsubmit.co/9eeaaf0d470462936e90ceea915e72b6',requestWebhook:'https://example.test/receiver'},addEventListener(_event,fn){pageshow=fn;}},
  document:{querySelectorAll:()=>[],querySelector:selector=>({'#request-form':form,'#form-status':status,'#preview-note':preview}[selector]),createElement:()=>({})},
  location:{hostname,protocol,origin:'https://example.test',pathname:'/install.html'},FormData:class{get(key){return key==='_honey'?honey:null;}},crypto:globalThis.crypto
 });
 await handler({preventDefault(){}});
 return {called,status:status.textContent,submit,fields,form,pageshow,handler};
}
for(const options of [{hostname:'localhost'},{hostname:'127.0.0.1'},{hostname:'[::1]'},{protocol:'file:'},{enabled:false}]){
 const result=await submitScenario(options);assert.equal(result.called,0);assert.match(result.status,/No request was sent/);
}
assert.equal((await submitScenario({valid:false})).called,0);
assert.equal((await submitScenario({honey:'spam'})).called,0);
const sent=await submitScenario();assert.equal(sent.called,1);assert.equal(sent.form.action,'https://formsubmit.co/9eeaaf0d470462936e90ceea915e72b6');assert.equal(sent.form.method,'POST');assert.equal(sent.fields.get('_webhook').value,'https://example.test/receiver');assert.match(sent.fields.get('request_id').value,/^[a-f0-9-]{36}$/);assert(sent.submit.disabled);assert.match(sent.status,/verify and send/);assert(!sent.status.includes('submitted'));
assert.equal(sent.fields.get('_url').value,'https://example.test/install.html');
const id=sent.fields.get('request_id').value;sent.pageshow();assert(!sent.submit.disabled);await sent.handler({preventDefault(){}});assert.equal(sent.fields.get('request_id').value,id);assert.equal(sent.fields.size,3);
const failed=await submitScenario({fail:true});assert.equal(failed.called,1);assert(!failed.submit.disabled);assert.match(failed.status,/could not be opened/);
console.log('Form contract checks pass: preview/disabled/invalid/spam guards, standard verification navigation, webhook/UUID, retry identity, back-navigation and failed navigation. No email sent.');
