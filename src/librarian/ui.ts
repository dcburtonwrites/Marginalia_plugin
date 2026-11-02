import type {ReviewMode,Destination,ReviewDocument,ReviewIndex} from "./model.ts";
export interface ReviewUIState {findingLimit?:number;saveFailed?:boolean;mode?:ReviewMode;doc?:ReviewDocument;path?:string;index:ReviewIndex[];developmentDestination:Destination;reportDestination:Destination;wholeDefault:boolean}
export interface ReviewUIActions {select(mode:ReviewMode):void;back():void;fresh():void;start(where:Destination):void;resume(id:string):void;reply(text:string):void;retry():void;end():void;continue():void;accept(id:string):void;dismiss(id:string):void;checked(id:string,value:boolean):void;vault(whole:boolean,where:Destination):void;open():void;save():void;more?():void}
interface Port {markdown(text:string,root:HTMLElement,source:string):void;source(path:string):void}
function node<K extends keyof HTMLElementTagNameMap>(root:HTMLElement,tag:K,cls='',text?:string){const el=root.ownerDocument.createElement(tag);el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function button(root:HTMLElement,label:string,action:()=>void,busy:boolean){const b=node(root,'button','',label);b.type='button';b.disabled=busy;b.onclick=action;return b;}
export function renderReviewWorkspace(root:HTMLElement,state:ReviewUIState,actions:ReviewUIActions,busy:boolean,target:string|null,port:Port){
 const mode=state.mode;if(mode!=='development'&&mode!=='vault')return false;
 const header=node(root,'div','marginalia-review-workspace-header');header.append(button(root,'Back to Review',actions.back,busy),node(root,'h3','',mode==='development'?'Entry Development':'Vault Review'));root.append(header);
 const doc=state.doc&&((mode==='development'&&state.doc.kind==='development')||(mode==='vault'&&state.doc.kind==='report'))?state.doc:undefined;
 if(!doc){
  root.append(node(root,'p','marginalia-muted',mode==='development'?'Explore what matters for this entry, its relationships and its role in the story. Your answers stay provisional until you accept a recommended change.':'Review the original material for story logic, underdeveloped ideas and meaningful missing connections. The result is an actionable checklist with source evidence.'));
  const form=node(root,'form','marginalia-review-setup'),where=mode==='development'?state.developmentDestination:state.reportDestination;
  let scope:HTMLSelectElement|undefined;
  if(mode==='vault'&&!state.wholeDefault){const label=node(root,'label','','Review scope');scope=node(root,'select');scope.setAttribute('aria-label','Vault review scope');for(const [value,name] of [['default',state.wholeDefault?'This world':'Current project and shared references'],['all','Entire vault']]){const o=node(root,'option','',name);o.value=value;scope.append(o);}label.append(scope);form.append(label);}
  const location=node(root,'label','','Save location'),select=node(root,'select');select.setAttribute('aria-label','Review save location');for(const [value,label] of [['visible','In the vault'],['hidden','Hidden in .marginalia']]){const o=node(root,'option','',label);o.value=value;select.append(o);}select.value=where.hidden?'hidden':'visible';location.append(select);
  const folderLabel=node(root,'label','','Folder'),folder=node(root,'input');folder.value=where.folder;folder.setAttribute('aria-label','Review folder');folderLabel.append(folder);folderLabel.hidden=where.hidden;select.onchange=()=>{folderLabel.hidden=select.value==='hidden';};form.append(location,folderLabel);
  const start=button(root,mode==='development'?'Start Development':'Begin Vault Review',()=>{},busy||mode==='development'&&!target);start.type='submit';start.className='mod-cta';form.append(start);form.onsubmit=event=>{event.preventDefault();const destination={hidden:select.value==='hidden',folder:folder.value};if(mode==='development')actions.start(destination);else actions.vault(scope?.value==='all'||state.wholeDefault,destination);};root.append(form);
  const saved=state.index.filter(x=>x.kind===(mode==='development'?'development':'report')&&(mode!=='development'||x.entry===target)).sort((a,b)=>b.updated.localeCompare(a.updated));
  if(saved.length){root.append(node(root,'h4','',mode==='development'?'Resume a conversation':'Saved reports'));for(const entry of saved)root.append(button(root,`${new Date(entry.updated).toLocaleString()} · ${entry.path.split('/').at(-1)}`,()=>actions.resume(entry.id),busy));}return true;
 }
 const tools=node(root,'div','marginalia-review-tools');if(!state.path?.startsWith('.marginalia/'))tools.append(button(root,'Open saved note',actions.open,false));tools.append(button(root,doc.kind==='development'?'New conversation':'New review',actions.fresh,busy||state.saveFailed===true));if(state.saveFailed)tools.append(button(root,'Retry save',actions.save,busy));root.append(tools,node(root,'p','marginalia-review-path marginalia-muted',state.path??''));
 if(doc.kind==='development'){
  const chat=node(root,'div','marginalia-development-chat');chat.setAttribute('aria-label','Development conversation');
  for(const message of doc.messages){const row=node(root,'article','marginalia-message');row.append(node(root,'strong','',message.role==='user'?'You':'Librarian'));const body=node(root,'div','marginalia-markdown');port.markdown(message.text,body,doc.entry);row.append(body);chat.append(row);}root.append(chat);
  const controls=node(root,'div','marginalia-review-tools');controls.append(button(root,doc.status==='active'?'End Development':'Continue Development',doc.status==='active'?actions.end:actions.continue,busy));if(doc.status==='active'&&(!doc.messages.length||doc.messages.at(-1)?.role==='user'))controls.append(button(root,'Retry response',actions.retry,busy));root.append(controls);
  for(const warning of doc.warnings)root.append(node(root,'p','marginalia-answer-warning',warning));
  if(doc.summary){root.append(node(root,'h3','','Development summary'));const summary=node(root,'div','marginalia-markdown');port.markdown(doc.summary,summary,doc.entry);root.append(summary);}
  for(const change of doc.changes){const card=node(root,'article','marginalia-suggestion');card.append(node(root,'h4','',`${change.kind.charAt(0).toUpperCase()+change.kind.slice(1)} · ${change.state}`),node(root,'p','',change.reason));const original=node(root,'blockquote','',change.before);card.append(original);
   if(change.kind!=='delete'){const after=node(root,'div','marginalia-markdown');port.markdown(change.after,after,doc.entry);card.append(node(root,'p','marginalia-muted',change.kind==='insert'?'Insert after the quoted passage:':'Replace the quoted passage with:'),after);}else card.append(node(root,'p','marginalia-muted','Remove the quoted passage.'));
   if(change.state==='pending'){const buttons=node(root,'div','marginalia-review-actions');buttons.append(button(root,'Accept change',()=>actions.accept(change.id),busy),button(root,'Dismiss',()=>actions.dismiss(change.id),busy));card.append(buttons);}root.append(card);
  }
 }else{
  root.append(node(root,'p','marginalia-muted',`${doc.scope} · ${doc.coverage.notes} notes supplied · ${doc.coverage.passes} AI ${doc.coverage.passes===1?"pass":"passes"}`));
  for(const notice of doc.notices)root.append(node(root,'p','marginalia-muted',notice));
  const limit=state.findingLimit??50,visible=doc.findings.slice(0,limit);
  for(const [category,label] of [['supported','Source-supported contradictions'],['concern','Possible concerns'],['opportunity','Development opportunities']] as const){root.append(node(root,'h3','',label));const findings=visible.filter(f=>f.category===category);if(!findings.length)root.append(node(root,'p','marginalia-muted',doc.findings.some(f=>f.category===category)?'More findings in this category are available below.':'No findings returned in this category.'));
   for(const f of findings){const card=node(root,'article','marginalia-suggestion'),label=node(root,'label','marginalia-review-check'),check=node(root,'input');check.type='checkbox';check.checked=f.checked;check.disabled=busy;check.onchange=()=>actions.checked(f.id,check.checked);label.append(check,node(root,'strong','',f.title));card.append(label,node(root,'p','marginalia-muted',`${f.priority} priority`),node(root,'p','',f.reason),node(root,'p','',`Next: ${f.next}`));
    for(const evidence of f.evidence)card.append(button(root,evidence.path,()=>port.source(evidence.path),false),node(root,'blockquote','',evidence.quote));if(f.entries.length)card.append(node(root,'p','',`Possible entries: ${f.entries.join('; ')}`));root.append(card);
   }
  }
  if(doc.findings.length>limit)root.append(button(root,`Show more findings (${doc.findings.length-limit} remaining)`,()=>actions.more?.(),busy));
  if(doc.deterministic){root.append(node(root,"h3","","Deterministic timeline notices"));for(const issue of doc.deterministic)root.append(button(root,issue.path,()=>port.source(issue.path),false),node(root,"p","",issue.message));if(!doc.deterministic.length)root.append(node(root,"p","marginalia-muted","No notices supplied in the admitted metadata. This is not a complete deterministic audit."));}
 }
 return true;
}
