import {MarkdownView,TFile,editorInfoField,type Plugin} from 'obsidian';
import {StateEffect,StateField,type EditorState} from '@codemirror/state';
import {Decoration,EditorView,ViewPlugin,type DecorationSet} from '@codemirror/view';
import {scriptMetadata} from './controller.ts';
import {scriptScope} from './model.ts';
import {fullScriptDisplay,hiddenScriptRanges,isScriptDialogue,type ScriptDisplay} from './visibility-model.ts';
import {el} from '../ui/sidebar.ts';

const changeDisplay=StateEffect.define<ScriptDisplay>();
function scriptIn(state:EditorState){
  const info=state.field(editorInfoField,false);if(!info?.file)return false;
  try{return scriptScope(info.file.path,scriptMetadata(state.doc.toString()))!==null;}catch{return false;}
}
function hidden(state:EditorState,show:ScriptDisplay):DecorationSet{
  if(Object.values(show).every(Boolean)||!scriptIn(state))return Decoration.none;
  return Decoration.set(hiddenScriptRanges(state.doc.toString(),show).filter(range=>
    !state.selection.ranges.some(selection=>selection.from<range.to&&selection.to>range.from||selection.empty&&selection.head>=range.from&&selection.head<range.to)
  ).map(range=>Decoration.replace({block:true}).range(range.from,range.to)),true);
}
export const scriptDisplayField=StateField.define<{show:ScriptDisplay;decorations:DecorationSet}>({
  create:()=>({show:fullScriptDisplay(),decorations:Decoration.none}),
  update(value,tr){
    let show=value.show;for(const effect of tr.effects)if(effect.is(changeDisplay))show=effect.value;
    return tr.docChanged||tr.selection||show!==value.show?{show,decorations:hidden(tr.state,show)}:value;
  },
  provide:field=>[EditorView.decorations.from(field,value=>value.decorations),EditorView.atomicRanges.of(view=>view.state.field(field).decorations)],
});
interface Controls {id:string;show:ScriptDisplay;menu:HTMLDetailsElement;apply:()=>void;editor?:(show:ScriptDisplay)=>void;remove:()=>void;}
const controls=new WeakMap<HTMLElement,Controls>();
export function markDialogue(root:HTMLElement){
  for(const paragraph of root.querySelectorAll<HTMLElement>('p')){
    const first=paragraph.firstElementChild;
    const prefix=first?paragraph.textContent?.slice(0,paragraph.textContent.indexOf(first.textContent??''))??'':'';
    const candidate=first?.tagName==='STRONG'&&!prefix.trim()?`**${first.textContent}**${first.nextSibling?.textContent??''}`:paragraph.textContent??'';
    paragraph.classList.toggle('marginalia-dialogue-block',isScriptDialogue(candidate));
  }
}
export function mountContentControls(host:HTMLElement,id:string,editor?:(show:ScriptDisplay)=>void){
  let current=controls.get(host);
  if(current?.id===id){if(!current.menu.isConnected)host.append(current.menu);if(editor)current.editor=editor;current.apply();return current;}
  current?.remove();
  const menu=el('details','marginalia-content-controls') as HTMLDetailsElement;
  const summary=el('summary','','View');summary.setAttribute('aria-label','Script display options');menu.append(summary);
  const panel=el('div','marginalia-content-menu');panel.setAttribute('role','group');panel.setAttribute('aria-label','Show content');panel.append(el('div','marginalia-content-menu-title','Show content'));
  const show=fullScriptDisplay();
  const record:Controls={id,show,menu,editor,
    apply:()=>{for(const key of ['panels','notes','dialogue'] as const)host.classList.toggle('marginalia-hide-'+key,!show[key]);markDialogue(host);record.editor?.({...show});},
    remove:()=>{menu.remove();host.classList.remove('marginalia-content-host','marginalia-hide-panels','marginalia-hide-notes','marginalia-hide-dialogue');controls.delete(host);},
  };
  for(const [key,name] of [['panels','Panel descriptions'],['notes','Callouts and notes'],['dialogue','Dialogue']] as const){
    const label=el('label'),input=el('input') as HTMLInputElement;input.type='checkbox';input.checked=true;
    input.onchange=()=>{show[key]=input.checked;record.apply();};label.append(input,el('span','',name));panel.append(label);
  }
  panel.append(el('small','marginalia-muted','Selected text stays visible while editing.'));
  menu.append(panel);host.classList.add('marginalia-content-host');host.append(menu);controls.set(host,record);
  let openedByHover=false;
  menu.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&!menu.open){menu.open=true;openedByHover=true;}});
  summary.addEventListener('click',event=>{if(event.detail>0&&openedByHover&&menu.open)event.preventDefault();openedByHover=false;});
  menu.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')menu.open=false;});
  menu.addEventListener('focusout',event=>{if(!menu.contains(event.relatedTarget as Node))menu.open=false;});
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;summary.focus();event.preventDefault();event.stopPropagation();}});
  return record;
}
export const scriptContentExtension=[scriptDisplayField,ViewPlugin.fromClass(class{
  private host:HTMLElement;private mounted?:Controls;private path='';private closed=false;private document?:EditorState['doc'];private recognized=false;private checkedPath='';
  constructor(private view:EditorView){this.host=view.dom.closest<HTMLElement>('.workspace-leaf-content')??view.dom;this.sync();}
  sync(){
    const path=this.view.state.field(editorInfoField,false)?.file?.path??'';
    if(this.document!==this.view.state.doc||this.checkedPath!==path){this.document=this.view.state.doc;this.checkedPath=path;this.recognized=scriptIn(this.view.state);}
    if(!this.recognized){this.mounted?.remove();this.mounted=undefined;this.path='';return;}
    if(this.path===path&&this.mounted?.menu.isConnected)return;
    this.path=path;
    this.mounted=mountContentControls(this.host,path,show=>{
      if(!this.closed&&this.view.dom.isConnected&&JSON.stringify(this.view.state.field(scriptDisplayField).show)!==JSON.stringify(show))
        queueMicrotask(()=>{if(!this.closed)this.view.dispatch({effects:changeDisplay.of(show)});});
    });
    this.mounted.apply();
  }
  update(){this.sync();}
  destroy(){this.closed=true;this.mounted?.remove();}
})];
export function registerContentControls(plugin:Plugin){
  const hosts=new Set<HTMLElement>();let closed=false;
  const refresh=()=>{
    if(closed)return;
    for(const host of hosts)if(!host.isConnected){controls.get(host)?.remove();hosts.delete(host);}
    plugin.app.workspace.iterateAllLeaves(leaf=>{
      if(!(leaf.view instanceof MarkdownView))return;
      const host=leaf.view.containerEl,file=leaf.view.file;
      const fields=file?plugin.app.metadataCache.getFileCache(file)?.frontmatter??{}:{};
      if(file&&scriptScope(file.path,fields)!==null){hosts.add(host);mountContentControls(host,file.path);}
      else controls.get(host)?.remove();
    });
  };
  plugin.app.workspace.onLayoutReady(refresh);
  plugin.registerEditorExtension(scriptContentExtension);
  plugin.registerMarkdownPostProcessor((root,context)=>{if(root.closest('.marginalia-compile-document'))return;
    const file=plugin.app.vault.getAbstractFileByPath(context.sourcePath);if(!(file instanceof TFile)||scriptScope(file.path,context.frontmatter??plugin.app.metadataCache.getFileCache(file)?.frontmatter??{})===null)return;
    markDialogue(root);refresh();});
  plugin.registerEvent(plugin.app.workspace.on('file-open',refresh));
  plugin.registerEvent(plugin.app.workspace.on('layout-change',refresh));
  plugin.register(()=>{closed=true;for(const host of hosts)controls.get(host)?.remove();hosts.clear();});
}

export function removeContentControls(host:HTMLElement){controls.get(host)?.remove();}
