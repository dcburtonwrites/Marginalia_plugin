import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
const rows=[],source=await readFile(new URL('./Code.gs',import.meta.url),'utf8');
let held=false;
const sheet={getLastRow:()=>rows.length+1,getRange:()=>({setVerticalAlignment(){return this;},setNumberFormat(){return this;},setWrap(){return this;},createTextFinder(id){return {matchEntireCell(){return this;},useRegularExpression(){return this;},findNext(){return rows.some(row=>row[7]===id)?{}:null;}};}}),appendRow:row=>rows.push(row)};
const context={SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush(){}},LockService:{getScriptLock:()=>({waitLock(){held=true;},hasLock:()=>held,releaseLock(){held=false;}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({text,setMimeType(){return this;}})}};
runInNewContext(source,context);
const base={name:'Preview visitor',email:'preview@example.com',type:'Feature request',message:'An integration test request.',consent:'yes',request_id:'test-request-12345'};
const post=data=>JSON.parse(context.doPost({postData:{contents:JSON.stringify({form_data:data})}}).text);
assert.equal(post(base).success,true);assert.equal(rows.length,1);assert.equal(rows[0][5],'New');assert.equal(held,false);
assert.equal(post(base).duplicate,true);assert.equal(rows.length,1);
assert.equal(post({...base,request_id:'test-request-23456',name:'=HYPERLINK("bad")',message:'+SUM(1,2) visitor text'}).success,true);
assert(rows[1][1].startsWith("'="));assert(rows[1][4].startsWith("'+"));
for(const data of [{...base,email:'bad'},{...base,type:'Unknown'},{...base,consent:''},{...base,request_id:''},{...base,message:'tiny'},{...base,message:'x'.repeat(10001)},{}])assert.equal(post(data).success,false);
assert.equal(post({...base,_honey:'spam'}).ignored,true);assert.equal(rows.length,2);
assert.equal(JSON.parse(context.doPost({postData:{contents:'bad json'}}).text).success,false);
assert.equal(JSON.parse(context.doPost({postData:{contents:JSON.stringify(base)}}).text).success,false);
for(const [suffix,body,type] of [
 ['nested-json',JSON.stringify({form_data:JSON.stringify({...base,request_id:'test-nested-json'})}),'application/json'],
 ['encoded-json',new URLSearchParams({form_data:JSON.stringify({...base,request_id:'test-encoded-json'})}).toString(),'application/x-www-form-urlencoded'],
 ['encoded-fields',new URLSearchParams(Object.entries({...base,request_id:'test-encoded-fields'}).map(([key,value])=>['form_data['+key+']',value])).toString(),'application/x-www-form-urlencoded; charset=UTF-8']
]){
 const event={postData:{contents:body,type}};
 assert.equal(JSON.parse(context.doPost(event).text).success,true,suffix);
 assert.equal(JSON.parse(context.doPost(event).text).duplicate,true,suffix+' retry');
}
assert.equal(JSON.parse(context.doPost({postData:{contents:'form_data=x&form_data=y',type:'application/x-www-form-urlencoded'}}).text).success,false);
assert.deepEqual(Object.keys(JSON.parse(context.doGet().text)),['service','status']);
console.log('Receiver checks pass: append, retry deduplication, formula-safe text, field limits, malformed payloads, spam guard and no public row reads. No Google or email calls made.');
