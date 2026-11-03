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
    const [file,hash]=url.split('#');
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
assert(config.includes('communityListed: false'),'Listing must remain pending until approved');
assert(config.includes('https://formsubmit.co/ajax/deondoesmore@gmail.com'),'Recipient endpoint');
assert(source.get('install.html').includes('type="email"')&&source.get('install.html').includes('name="consent"'),'Form validation and consent');
const script=await readFile(resolve(root,'site.js'),'utf8');
assert(script.includes('Preview only:')&&script.includes('location.protocol==="file:"'),'No local-preview email sends');
assert(script.includes('response.ok')&&script.includes('result.success'),'Provider response validation');
const files=await readdir(root);
assert.equal(files.filter(name=>name.endsWith('.html')).length,3,'Three pages');
console.log(`Website check passed: three pages, ${links} local links/assets/anchors, release version, donation destination and form guards.`);

// Exercise the production form handler with a simulated provider, never the network.
const {runInNewContext}=await import('node:vm');
async function submitScenario({hostname='example.test',protocol='https:',valid=true,honey='',enabled=true,response='success'}={}){
  let handler,reset=false,called=0,payload;
  const status={textContent:'',classList:{remove(){},add(){}}};
  const submit={disabled:false,textContent:'Send request'};
  const form={querySelector:()=>submit,reportValidity:()=>valid,reset(){reset=true;},addEventListener(_event,fn){handler=fn;}};
  const preview={hidden:true};
  runInNewContext(script,{
    window:{MARGINALIA:{communityListed:false,requestsEnabled:enabled,requestEndpoint:'https://formsubmit.co/ajax/deondoesmore@gmail.com'}},
    document:{querySelectorAll:()=>[],querySelector:selector=>({'#request-form':form,'#form-status':status,'#preview-note':preview}[selector])},
    location:{hostname,protocol},
    FormData:class {get(){return honey;}*[Symbol.iterator](){yield ['email','preview@example.com'];yield ['message','A test request'];yield ['_honey',honey];}},
    AbortController,setTimeout,clearTimeout,
    fetch:async(url,options)=>{called++;payload={url,...options};
      if(response==='network')throw new Error('Offline');
      return {ok:response!=='http',json:async()=>{if(response==='malformed')throw new Error('Bad JSON');return {success:response==='rejected'?false:response==='string'?'true':true};}};
    }
  });
  await handler({preventDefault(){}});
  return {called,reset,status:status.textContent,disabled:submit.disabled,payload,preview};
}
for(const options of [{hostname:'localhost'},{hostname:'127.0.0.1'},{hostname:'[::1]'},{protocol:'file:'},{enabled:false}]){
  const result=await submitScenario(options);assert.equal(result.called,0);assert.match(result.status,/No request was sent/);
}
assert.equal((await submitScenario({valid:false})).called,0);
assert.equal((await submitScenario({honey:'spam'})).called,0);
for(const response of ['success','string']){
  const result=await submitScenario({response});assert.equal(result.called,1);assert(result.reset);assert(!result.disabled);
  assert.equal(JSON.parse(result.payload.body).email,'preview@example.com');assert.match(result.status,/Request submitted/);
}
for(const response of ['network','http','malformed','rejected']){
  const result=await submitScenario({response});assert.equal(result.called,1);assert(!result.reset);assert(!result.disabled);assert.match(result.status,/could not be submitted/);
}
console.log('Form contract check passed: 13 local/disabled/invalid/spam/success/failure cases with a simulated provider. No email sent.');
