"use strict";
const config = window.MARGINALIA;
for (const link of document.querySelectorAll("[data-donate]")) link.href = config.donationUrl;
if(config.communityListed){
  document.querySelector("[data-community-pending]")?.setAttribute("hidden", "");
  document.querySelector("[data-community-ready]")?.removeAttribute("hidden");
}
const tabs=[...document.querySelectorAll("[role=tab]")];
const demos={
 threads:{src:"assets/threads.png",alt:"Threads view in Marginalia: a highlighted participant connects events across location lanes.",caption:"Threads follows the same entry between recorded events, including across location lanes. Sample vault shown; connections record participation, not continuous presence or travel."},
 canon:{src:"assets/canon.png",alt:"Marginalia Canon page with entry types and searchable entries.",caption:"A home for Canon, Brainstorms and Projects, with configurable entry types and templates. Sample vault shown."},
 scripts:{src:"assets/scripts.png",alt:"Marginalia Script Studio with project outline and writing controls.",caption:"Built for comics and graphic novels: keep scripts, pages and panels in an outline beside your writing. Select a project or grouping and keep your place. Sample vault shown."},
 librarian:{src:"assets/librarian.png",alt:"The local Librarian sidebar showing note context and source references.",caption:"Bring original entries and linked context into a conversation with a local model. Your writing changes only when you accept a proposed edit. Sample vault shown."}
};
function showDemo(tab,focus=false){
 if(!tab)return;
 tabs.forEach(t=>{t.setAttribute("aria-selected",String(t===tab));t.tabIndex=t===tab?0:-1;});
 const demo=demos[tab.dataset.demo],image=document.querySelector("#demo-image");
 image.src=demo.src;image.alt=demo.alt;image.classList.toggle("thread-screen",tab.dataset.demo==="threads");
 document.querySelector("#demo-caption").textContent=demo.caption;
 document.querySelector("#demo-title").textContent=tab.textContent;
 if(focus)tab.focus();
}
tabs.forEach((tab,index)=>{tab.addEventListener("click",()=>showDemo(tab));tab.addEventListener("keydown",e=>{
 let next;if(e.key==="ArrowRight")next=(index+1)%tabs.length;else if(e.key==="ArrowLeft")next=(index+tabs.length-1)%tabs.length;else if(e.key==="Home")next=0;else if(e.key==="End")next=tabs.length-1;else return;e.preventDefault();showDemo(tabs[next],true);
});});
const form=document.querySelector("#request-form");
if(form){
 const status=document.querySelector("#form-status"),submit=form.querySelector("button[type=submit]");
 submit.disabled=false;
 const local=location.protocol==="file:"||["localhost","127.0.0.1","::1","[::1]"].includes(location.hostname);
 if(local)document.querySelector("#preview-note").hidden=false;
 form.addEventListener("submit",async e=>{
  e.preventDefault();status.classList.remove("error");
  if(!form.reportValidity())return;
  const data=new FormData(form);
  if(String(data.get("_honey")||""))return;
  if(local||!config.requestsEnabled){status.textContent="Preview only: your form is valid. No request was sent.";return;}
  submit.disabled=true;submit.textContent="Sending…";status.textContent="Sending your request…";
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(config.requestEndpoint,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(Object.fromEntries(data)),signal:controller.signal});
   if(!response.ok)throw new Error("Request failed");
   const result=await response.json();
   if(result.success!==true&&result.success!=="true")throw new Error("Request failed");
   form.reset();status.textContent="Request submitted. Thank you for helping shape Marginalia.";
  }catch{status.classList.add("error");status.textContent="Your request could not be submitted. Please try again or email deondoesmore@gmail.com. Your message is still here.";}
  finally{clearTimeout(timeout);submit.disabled=false;submit.textContent="Send request";}
 });
}
