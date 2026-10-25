import { Platform } from "obsidian";
import type { CompileOptions } from "./compile-model.ts";

/** Desktop-only host capability, loaded only on an explicit preview/export. */
function desktop() {
  if(Platform.isMobile)throw new Error("PDF export is available on desktop. You can preview the compiled script here.");
  try {
    const electron=require("electron");
    const remote=electron.remote??require("@electron/remote");
    if(!remote.BrowserWindow||!remote.dialog)throw new Error();
    return remote;
  } catch {throw new Error("This Obsidian desktop host does not expose the local PDF print engine.");}
}
export const pdfCSS = `
@page { margin: 0.65in; }
html, body { margin:0; padding:0; background:#fff; color:#171717; font-family:Arial,Helvetica,sans-serif; font-size:11pt; line-height:1.5; }
* { box-sizing:border-box; }
h1 {font-size:21pt;margin:0 0 20pt} h2 {font-size:16pt;margin:22pt 0 12pt;break-after:avoid} h3,h4 {break-after:avoid}
p {margin:8pt 0} a {color:inherit;text-decoration:none} img {max-width:100%;max-height:9in;object-fit:contain}
.callout {margin:15pt 0;padding:0;border:0;background:none;break-inside:avoid}
.callout-title {font-weight:bold;margin-bottom:5pt;display:block}.callout-icon,.callout-fold,.heading-collapse-indicator,.collapse-indicator,.edit-block-button {display:none!important}
.callout-content {display:block!important}.callout-content p:first-child {margin-top:0}.callout-title:before,.callout-title:after {content:none!important}
blockquote {border-left:2px solid #aaa;margin:10pt 0;padding-left:12pt}
.marginalia-compile-script {margin:0 0 30pt}.marginalia-compile-file-break {break-before:page}
.marginalia-compile-cover {break-after:page;text-align:center;padding-top:2.5in;min-height:8in}
.marginalia-compile-metadata {font-size:9pt;color:#555;margin-bottom:20pt}
table {border-collapse:collapse;width:100%;font-size:10pt}td,th {border-bottom:1px solid #ddd;text-align:left;padding:5pt}
pre {white-space:pre-wrap;overflow-wrap:anywhere}li {break-inside:avoid}svg,canvas,iframe,video,audio {display:none}
`;
export function pdfDocument(content:string, paper:CompileOptions["paper"]) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Compiled script</title><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:"><style>${pdfCSS}@page{size:${paper==="A4"?"A4":"Letter"}}</style></head><body>${content}</body></html>`;
}
export async function renderCompiledPDF(html:string,options:CompileOptions,signal:AbortSignal):Promise<Uint8Array> {
  signal.throwIfAborted();
  const remote=desktop();
  const win=new remote.BrowserWindow({show:false,width:900,height:1200,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
  const stop=()=>{if(!win.isDestroyed())win.destroy();};
  signal.addEventListener("abort",stop,{once:true});
  const deadline=setTimeout(stop,60000);
  try {
    win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
    win.webContents.on("will-navigate",(event:{preventDefault():void})=>event.preventDefault());
    await win.loadURL("data:text/html;charset=utf-8,"+encodeURIComponent(html));
    signal.throwIfAborted();
    await win.webContents.executeJavaScript("Promise.all([document.fonts.ready, ...Array.from(document.images, image => image.decode().catch(() => {}))]).then(() => true)");
    signal.throwIfAborted();
    const bytes=await win.webContents.printToPDF({pageSize:options.paper,printBackground:false,preferCSSPageSize:true,
      margins:{top:0.65,bottom:0.65,left:0.65,right:0.65},displayHeaderFooter:options.pdfNumbers,
      headerTemplate:"<span></span>",footerTemplate:'<div style="font-family:Arial;font-size:9px;width:100%;text-align:center;color:#666">PDF sheet <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
    signal.throwIfAborted();return new Uint8Array(bytes);
  } finally {clearTimeout(deadline);signal.removeEventListener("abort",stop);stop();}
}
export async function saveCompiledPDF(bytes:Uint8Array,filename:string,verify:()=>Promise<void>,signal:AbortSignal) {
  signal.throwIfAborted();
  const remote=desktop();
  const result=await remote.dialog.showSaveDialog({title:"Export compiled PDF",defaultPath:filename,filters:[{name:"PDF document",extensions:["pdf"]}]});
  if(result.canceled||!result.filePath)return false;
  signal.throwIfAborted();await verify();signal.throwIfAborted();
  const fs=require("node:fs/promises") as typeof import("node:fs/promises");
  // The native dialog owns destination/overwrite consent. No source-note writer is used.
  const temporary=result.filePath+".marginalia-"+Date.now()+"-"+Math.random().toString(36).slice(2)+".tmp";
  try {
    await fs.writeFile(temporary,bytes,{flag:"wx"});
    signal.throwIfAborted();await verify();signal.throwIfAborted();
    await fs.rename(temporary,result.filePath);
  } finally {await fs.unlink(temporary).catch(()=>{});}
  return true;
}
