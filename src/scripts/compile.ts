import { Component, ItemView, MarkdownRenderer, Modal, Notice, Platform, Setting, TFile, loadPdfJs, type WorkspaceLeaf } from "obsidian";
import { el, button } from "../ui/sidebar.ts";
import type { ScriptController } from "./controller.ts";
import type { ScriptGroup } from "./model.ts";
import { compileCover, compileMarkdown, compileTitle, compileKey, compileFilename, groupFingerprint, makeCompileJob, readCompileOptions, type CompileJob, type CompileOptions } from "./compile-model.ts";
import { pdfCSS, pdfDocument, renderCompiledPDF, saveCompiledPDF } from "./compile-pdf.ts";

export const COMPILATION = "marginalia-compile";
const lifetimes=new WeakMap<ScriptController,AbortSignal>();
const message=(error:unknown)=>error instanceof Error?error.message:String(error);
const groupName=(scope:string)=>scope.split("/").at(-1)||scope;
const optionsKey=(group:ScriptGroup)=>compileKey(group.scope,group.group);
const checkbox=(root:HTMLElement,name:string,checked:boolean,change:(value:boolean)=>void,description?:string)=>{
  const row=el("label","marginalia-compile-check"),input=el("input") as HTMLInputElement;
  input.type="checkbox";input.checked=checked;
  const text=el("span","",name);if(description)text.append(el("small","marginalia-muted",description));
  input.onchange=()=>change(input.checked);row.append(input,text);root.append(row);return input;
};

export function registerCompilation(controller:ScriptController) {
  const plugin=controller.plugin;
  const lifetime=new AbortController();lifetimes.set(controller,lifetime.signal);
  plugin.register(()=>lifetime.abort());
  plugin.registerView(COMPILATION,leaf=>new CompilationView(leaf,controller));
  plugin.addCommand({id:"compile-pdf",name:"Compile scripts to PDF",callback:()=>openCompileOptions(controller)});
}
export function openCompileOptions(controller:ScriptController,scope=controller.session.data.selection?.scope,group=controller.session.data.selection?.group) {
  if(lifetimes.get(controller)?.aborted)return;
  if(!scope){new Notice("Choose a project in Script Studio before compiling.");return;}
  new CompileModal(controller,scope,group).open();
}
export class CompileModal extends Modal {
  private closed=false;
  private groups:ScriptGroup[]=[];
  private stop=()=>this.close();
  private options=readCompileOptions(undefined);
  private author="";
  constructor(private controller:ScriptController,private projectScope:string,private group?:string){super(controller.plugin.app);}
  onOpen(){lifetimes.get(this.controller)?.addEventListener("abort",this.stop,{once:true});this.closed=false;this.modalEl.classList.add("marginalia-compile-modal");void this.load().catch(error=>{if(!this.closed)this.contentEl.replaceChildren(el("p","marginalia-script-warning",message(error)));});}
  private async load(){this.groups=(await this.controller.groups()).filter(g=>g.scope===this.projectScope);if(this.closed)return;this.author=this.controller.session.data.compilationAuthor;this.readOptions();this.draw();}
  private readOptions(){this.options=readCompileOptions(this.group===undefined?undefined:this.controller.session.data.compilation[compileKey(this.projectScope,this.group)]);}
  private draw(){
    const root=this.contentEl;root.replaceChildren();
    root.append(el("h2","","Compile PDF"),el("p","marginalia-compile-context",`${groupName(this.projectScope)}${this.group!==undefined?" / "+this.group:""}`));
    if(this.groups.length===0){root.append(el("p","","No script Groups are available in this project."));return;}
    new Setting(root).setName("Group").addDropdown(drop=>{
      drop.addOption("","Choose a Group");for(const group of this.groups)drop.addOption(group.group,group.group);
      drop.setValue(this.group??"").onChange(value=>{this.group=value||undefined;this.readOptions();this.draw();});
    });
    const selected=this.groups.find(g=>g.group===this.group);
    if(!selected){root.append(el("p","marginalia-muted","Choose one Group so separate drafts are not mixed."));return;}
    const scripts=selected.sequences.flat(),inclusion=el("details","marginalia-compile-section"),summary=el("summary");inclusion.append(summary);
    const countLabel=()=>{
      const included=scripts.filter(s=>!this.options.excluded.includes(s.path));
      summary.textContent=`Included scripts · ${included.length} of ${scripts.length}`;
      counts.textContent=`${included.length} scripts · ${included.reduce((n,s)=>n+s.slots,0)} comic pages`;
      preview.disabled=!included.length||!!selected.issues.length||(this.options.cover&&!this.author.trim());
    };
    for(const script of scripts)checkbox(inclusion,`${compileTitle(script)} · ${script.slots} pp.`,!this.options.excluded.includes(script.path),value=>{
      this.options.excluded=this.options.excluded.filter(p=>p!==script.path);if(!value)this.options.excluded.push(script.path);countLabel();
    });
    inclusion.append(el("p","marginalia-muted","Uses this Group’s reading order."));root.append(inclusion);
    const content=el("div","marginalia-compile-section");content.setAttribute("role","group");content.setAttribute("aria-label","Content Selections");
    content.append(el("h3","marginalia-compile-content-title","Content Selections"));root.append(content);
    checkbox(content,"Panel Descriptions",this.options.panels,value=>{this.options.panels=value;},"Panel numbers, titles and dialogue remain included.");
    checkbox(content,"Callouts and Notes",this.options.notes,value=>{this.options.notes=value;});
    checkbox(content,"Title page",this.options.cover,value=>{this.options.cover=value;authorRow.hidden=!value;countLabel();});
    const authorRow=el("div");authorRow.hidden=!this.options.cover;content.append(authorRow);
    new Setting(authorRow).setName("Author name").setDesc("Shown in the title-page byline. Remembered in this vault for future prints; you can change it here.").addText(text=>{
      text.inputEl.setAttribute("aria-label","Author name");text.inputEl.maxLength=200;text.inputEl.required=true;
      text.setPlaceholder("Enter author name").setValue(this.author).onChange(value=>{this.author=value;countLabel();});
    });
    const advanced=el("details","marginalia-compile-section");advanced.append(el("summary","","Advanced"));root.append(advanced);
    new Setting(advanced).setName("Paper").addDropdown(drop=>drop.addOption("Letter","US Letter").addOption("A4","A4").setValue(this.options.paper).onChange(value=>{this.options.paper=value as CompileOptions["paper"];}));
    new Setting(advanced).setName("Story numbering").addDropdown(drop=>drop.addOption("local","Restart each script").addOption("continuous","Continue through Group").setValue(this.options.numbers).onChange(value=>{this.options.numbers=value as CompileOptions["numbers"];}));
    checkbox(advanced,"New PDF sheet for each script",this.options.breaks,value=>{this.options.breaks=value;});
    checkbox(advanced,"Include script metadata",this.options.metadata,value=>{this.options.metadata=value;});
    checkbox(advanced,"PDF sheet numbers",this.options.pdfNumbers,value=>{this.options.pdfNumbers=value;});
    if(this.options.numbers==="continuous")advanced.append(el("p","marginalia-muted","Excluded scripts retain their place in the Group’s story numbering."));
    if(selected.issues.length)root.append(el("p","marginalia-script-warning","Repair this Group’s reading-order issues in Script Studio before compiling."));
    const error=el("p","marginalia-script-warning");error.setAttribute("role","alert");error.hidden=true;root.append(error);
    const footer=el("div","marginalia-compile-modal-footer"),counts=el("span","marginalia-muted"),actions=el("div","marginalia-compile-actions");
    const preview=button(Platform.isMobile?"Preview script":"Preview PDF",()=>{
      preview.disabled=true;
      void (async()=>{
        const current=(await this.controller.groups()).find(g=>g.scope===this.projectScope&&g.group===this.group);
        if(!current||groupFingerprint(current)!==groupFingerprint(selected))throw new Error("Scripts changed while these options were open. Reopen compilation options to review the updated list.");
        const job=makeCompileJob(current,this.options,this.author);
        this.controller.session.data.compilation[optionsKey(current)]=readCompileOptions(this.options);
        if(this.options.cover)this.controller.session.data.compilationAuthor=job.author;
        await this.controller.plugin.savePluginData();if(this.closed)return;
        this.close();await openCompilePreview(this.controller,job);
      })().catch(reason=>{if(!this.closed){error.textContent=message(reason);error.hidden=false;countLabel();}else new Notice(message(reason));});
    },"mod-cta");
    actions.append(button("Cancel",()=>this.close()),preview);footer.append(counts,actions);root.append(footer);
    if(Platform.isMobile)root.append(el("p","marginalia-muted","Script preview is available here. Export the PDF from desktop Obsidian."));
    countLabel();
  }
  onClose(){lifetimes.get(this.controller)?.removeEventListener("abort",this.stop);this.closed=true;this.contentEl.replaceChildren();}
}
async function openCompilePreview(controller:ScriptController,job:CompileJob) {
  const signal=lifetimes.get(controller);signal?.throwIfAborted();
  const workspace=controller.plugin.app.workspace;
  let leaf=workspace.getLeavesOfType(COMPILATION).find(l=>l.view instanceof CompilationView&&l.view.projectScope===job.scope&&l.view.group===job.group);
  if(!leaf){leaf=workspace.getLeaf("tab");await leaf.setViewState({type:COMPILATION,active:true,state:{scope:job.scope,group:job.group}});}
  signal?.throwIfAborted();await workspace.revealLeaf(leaf);signal?.throwIfAborted();
  if(!(leaf.view instanceof CompilationView))throw new Error("Could not open the compilation preview.");
  await leaf.view.build(job);
}

export class CompilationView extends ItemView {
  projectScope="";group="";
  private job?:CompileJob;
  private aborter=new AbortController();
  private generation=0;
  private component?:Component;
  private pdf?:Uint8Array;
  private pdfDoc:any;
  private pdfPage=1;
  private pageTask:any;
  private stale=false;
  private resources=new Map<string,string>();
  private exporting=false;
  private dirtyTimer?:ReturnType<typeof setTimeout>;
  private status?:HTMLElement;
  private exportButton?:HTMLButtonElement;
  constructor(leaf:WorkspaceLeaf,private controller:ScriptController){super(leaf);}
  getViewType(){return COMPILATION;}
  getDisplayText(){return this.projectScope?`${groupName(this.projectScope)} · Compile`:"Compile PDF";}
  getIcon(){return "file-output";}
  getState(){return {scope:this.projectScope,group:this.group};}
  async setState(state:{scope?:string;group?:string},result:{history:boolean}){this.projectScope=state.scope??"";this.group=state.group??"";await super.setState(state,result);}
  async onOpen(){
    this.contentEl.classList.add("marginalia-compilation");
    this.contentEl.replaceChildren(el("h2","","Compilation preview"),el("p","marginalia-muted","Open compilation options to build a preview."),button("Compile options…",()=>openCompileOptions(this.controller,this.projectScope||undefined,this.group||undefined)));
    const changed=(path:string)=>{
      if(!this.job||(this.job.scope!=="Vault"&&!path.startsWith(this.job.scope+"/")&&!this.resources.has(path)))return;
      this.stale=true;this.updateExport();
      clearTimeout(this.dirtyTimer);this.dirtyTimer=setTimeout(()=>void this.verify().then(()=>{this.stale=false;this.updateExport();}).catch(()=>this.updateExport()),200);
    };
    this.registerEvent(this.app.vault.on("modify",file=>changed(file.path)));
    this.registerEvent(this.app.vault.on("create",file=>changed(file.path)));
    this.registerEvent(this.app.vault.on("delete",file=>changed(file.path)));
    this.registerEvent(this.app.vault.on("rename",(file,old)=>{changed(old);changed(file.path);}));
    this.registerEvent(this.app.workspace.on("editor-change",(_editor,info)=>{if(info.file)changed(info.file.path);}));
  }
  async onClose(){this.generation++;this.aborter.abort();clearTimeout(this.dirtyTimer);this.pageTask?.cancel();await this.pdfDoc?.destroy();if(this.component)this.removeChild(this.component);this.component=undefined;}
  private async verify(){
    if(!this.job)throw new Error("Build a compilation preview first.");
    for(const [path,stamp] of this.resources){const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile)||JSON.stringify([file.stat.mtime,file.stat.size])!==stamp){this.stale=true;throw new Error("An included image changed. Rebuild the compilation preview before exporting.");}}
    const current=(await this.controller.groups()).find(g=>g.scope===this.job!.scope&&g.group===this.job!.group);
    if(!current||current.issues.length||groupFingerprint(current)!==this.job.fingerprint){this.stale=true;throw new Error("This preview is outdated. Open compilation options and rebuild it before exporting.");}
  }
  private updateExport(){
    if(this.exportButton)this.exportButton.disabled=!this.pdf||this.stale||this.exporting;
    if(this.stale&&this.status)this.status.textContent="Preview outdated · Open compilation options to rebuild.";
    else if(this.pdf&&this.status&&!this.exporting)this.status.textContent="Preview up to date";
    else if(Platform.isMobile&&this.status&&!this.stale)this.status.textContent="Script preview · PDF export is available on desktop.";
  }
  async build(job:CompileJob){
    const generation=++this.generation;
    this.aborter.abort();this.aborter=new AbortController();const signal=this.aborter.signal;
    this.pageTask?.cancel();await this.pdfDoc?.destroy();this.pdfDoc=undefined;if(signal.aborted||generation!==this.generation)return;this.pdf=undefined;this.job=job;this.projectScope=job.scope;this.group=job.group;this.stale=false;this.resources.clear();
    if(this.component)this.removeChild(this.component);this.component=new Component();this.addChild(this.component);
    const root=this.contentEl;root.replaceChildren();
    const header=el("div","marginalia-compile-preview-header"),title=el("div");
    title.append(el("h2","",`${groupName(job.scope)} / ${job.group}`),el("p","marginalia-muted",`${job.scripts.length} scripts · ${job.scripts.reduce((n,s)=>n+s.slots,0)} comic pages · ${job.options.paper==="Letter"?"US Letter":"A4"}`));
    const actions=el("div","marginalia-compile-actions");actions.append(button("Compile options…",()=>openCompileOptions(this.controller,job.scope,job.group)));
    this.exportButton=button("Export PDF…",()=>void this.exportPDF(),"mod-cta");this.exportButton.disabled=true;actions.append(this.exportButton);header.append(title,actions);root.append(header);
    this.status=el("p","marginalia-compile-status",Platform.isMobile?"Script preview · PDF export is available on desktop.":"Preparing PDF preview…");this.status.setAttribute("role","status");root.append(this.status);
    const warnings=el("div","marginalia-compile-warnings"),document=el("div","marginalia-compile-document markdown-rendered");root.append(warnings,document);
    try {
      const issues=await renderCompilation(this.controller,job,document,this.component,signal,(file)=>this.resources.set(file.path,JSON.stringify([file.stat.mtime,file.stat.size])));
      if(signal.aborted||generation!==this.generation)return;
      for(const issue of issues)warnings.append(el("p","marginalia-script-warning",issue));
      if(Platform.isMobile){await this.verify();return;}
      const html=pdfDocument(cleanCompilationHTML(document),job.options.paper);
      this.pdf=await renderCompiledPDF(html,job.options,signal);
      await this.verify();signal.throwIfAborted();
      const library=await loadPdfJs();signal.throwIfAborted();
      this.pdfDoc=await library.getDocument({data:this.pdf.slice()}).promise;
      if(signal.aborted||generation!==this.generation){await this.pdfDoc.destroy();return;}
      document.classList.add("marginalia-compile-accessible-source");
      const controls=el("div","marginalia-compile-pagination"),label=el("span");
      const previous=button("Previous sheet",()=>{if(this.pdfPage>1){this.pdfPage--;void draw();}}),next=button("Next sheet",()=>{if(this.pdfPage<this.pdfDoc.numPages){this.pdfPage++;void draw();}});
      controls.append(previous,label,next);const sheet=el("div","marginalia-compile-sheet");root.append(controls,sheet);this.pdfPage=1;
      const draw=async()=>{
        try {
          this.pageTask?.cancel();const index=this.pdfPage, page=await this.pdfDoc.getPage(index);
          if(signal.aborted||index!==this.pdfPage)return;
          const width=Math.max(240,Math.min(root.clientWidth-48,850)),base=page.getViewport({scale:1}),scale=width/base.width;
          const viewport=page.getViewport({scale:scale*Math.min(root.ownerDocument.defaultView?.devicePixelRatio??1,2)});
          const canvas=root.ownerDocument.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.setAttribute("role","img");canvas.setAttribute("aria-label",`PDF sheet ${index} of ${this.pdfDoc.numPages}`);
          sheet.replaceChildren(canvas);previous.disabled=index===1;next.disabled=index===this.pdfDoc.numPages;label.textContent=`PDF sheet ${index} / ${this.pdfDoc.numPages}`;
          this.pageTask=page.render({canvasContext:canvas.getContext("2d"),canvas,viewport});await this.pageTask.promise;
        } catch(error){if(!signal.aborted&&(error as Error)?.name!=="RenderingCancelledException")this.status!.textContent=message(error);}
      };
      await draw();this.updateExport();
    } catch(error){
      if(signal.aborted)return;
      if(this.status)this.status.textContent=message(error);
      document.classList.remove("marginalia-compile-accessible-source");this.pdf=undefined;this.updateExport();
    }
  }
  private async exportPDF(){
    if(this.exporting||!this.pdf||!this.job)return;
    this.exporting=true;this.updateExport();
    try {
      await this.verify();
      const saved=await saveCompiledPDF(this.pdf,compileFilename(this.job),()=>this.verify(),this.aborter.signal);
      if(this.status)this.status.textContent=saved?"PDF exported.":"Export cancelled.";
    } catch(error){if(!this.aborter.signal.aborted&&this.status)this.status.textContent=message(error);}
    finally {this.exporting=false;if(this.exportButton)this.exportButton.disabled=!this.pdf||this.stale;}
  }
}

async function renderCompilation(controller:ScriptController,job:CompileJob,root:HTMLElement,component:Component,signal:AbortSignal,resource:(file:TFile)=>void){
  const warnings:string[]=[];const {app}=controller.plugin;let imageBytes=0;
  if(job.options.cover){const title=compileCover(job),cover=el("section","marginalia-compile-cover");cover.append(el("h1","",title.title),el("p","",title.subtitle),el("p","marginalia-compile-byline",title.byline));root.append(cover);}
  let start=1;
  // Continuous numbering retains excluded scripts' positions in the original Group.
  for(const [index,script] of job.scripts.entries()){
    signal.throwIfAborted();
    const section=el("article","marginalia-compile-script"+(index&&job.options.breaks?" marginalia-compile-file-break":""));section.append(el("h1","",compileTitle(script)));root.append(section);
    if(job.options.metadata){const metadata=el("div","marginalia-compile-metadata");for(const [key,value] of Object.entries(script.metadata)){if(value===undefined||value===null||value==="")continue;metadata.append(el("p","",`${key}: ${typeof value==="object"?JSON.stringify(value):String(value)}`));}section.append(metadata);}
    if(job.options.numbers==="continuous")start=job.starts[script.path]??start;else start=1;
    const result=compileMarkdown(script,job.options,start),body=el("div");section.append(body);
    await MarkdownRenderer.render(app,result.markdown,body,script.path,component);signal.throwIfAborted();
    for(const image of result.images){
      let imageNode:HTMLElement;const target=image.target.split("#")[0];
      const remote=/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target);
      const file=!remote&&target?app.metadataCache.getFirstLinkpathDest(target,script.path):null;
      if(file instanceof TFile&&/\.(?:png|jpe?g|gif|webp)$/i.test(file.path)&&file.stat.size<=20*1024*1024&&imageBytes+file.stat.size<=100*1024*1024){
        resource(file);const bytes=await app.vault.readBinary(file);imageBytes+=bytes.byteLength;signal.throwIfAborted();
        const mime=/\.png$/i.test(file.path)?"image/png":/\.gif$/i.test(file.path)?"image/gif":/\.webp$/i.test(file.path)?"image/webp":"image/jpeg";
        imageNode=root.ownerDocument.createElement("img");imageNode.setAttribute("alt",image.alt);imageNode.setAttribute("src",`data:${mime};base64,${arrayBufferToBase64(bytes)}`);
      } else {imageNode=el("span","",`[Image omitted: ${image.alt||target||"unresolved image"}]`);warnings.push(`${compileTitle(script)}: an image or embedded note could not be included (${image.alt||target||"unresolved reference"}). Local PNG, JPEG, GIF and WebP images up to 20 MB each (100 MB total) are supported; external images are not downloaded.`);}
      const walker=root.ownerDocument.createTreeWalker(body,4);let node:Node|null;
      while((node=walker.nextNode())){if(!node.textContent?.includes(image.token))continue;const parts=node.textContent.split(image.token);const fragment=root.ownerDocument.createDocumentFragment();parts.forEach((part,i)=>{if(i)fragment.append(imageNode.cloneNode(true));fragment.append(root.ownerDocument.createTextNode(part));});node.parentNode?.replaceChild(fragment,node);break;}
    }
    start+=script.slots;
  }
  return [...new Set(warnings)];
}
function arrayBufferToBase64(buffer:ArrayBuffer){let binary="";const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
export function cleanCompilationHTML(root:HTMLElement){
  const copy=root.cloneNode(true) as HTMLElement;
  copy.querySelectorAll("script,style,iframe,object,embed,video,audio,source,link,meta,form,input,button,svg,canvas").forEach(node=>node.remove());
  for(const node of copy.querySelectorAll<HTMLElement>("*")){
    for(const attribute of [...node.attributes])if(!["class","src","alt","href","colspan","rowspan"].includes(attribute.name))node.removeAttribute(attribute.name);
    if(node.tagName==="IMG"&&!/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(node.getAttribute("src")??""))node.remove();
    if(node.tagName==="A"&&!/^https?:\/\//i.test(node.getAttribute("href")??"")){node.removeAttribute("href");}
  }
  return copy.innerHTML;
}
