"use strict";
const config = window.MARGINALIA;
for (const link of document.querySelectorAll("[data-donate]")) link.href = config.donationUrl;

const tabs=[...document.querySelectorAll("[role=tab]")];
const demos={
 threads:{src:"assets/greek-threads.png",alt:"Hermes’s appearances connected across the Greek Demo timeline location lanes.",caption:"Hermes’s Canon chip follows his recorded appearances across the Greek Demo’s location lanes. Connections record participation, not continuous presence or travel."},
 canon:{src:"assets/greek-world.png",alt:"Greek Demo Home with Continue Writing, three Recently Opened cards and pinned walkthroughs.",caption:"Greek Demo Home puts Continue Writing beside three recent notes, with walkthroughs pinned below. This is the same world included in the download."},
 scripts:{src:"assets/greek-scripts.png",alt:"The Greek Demo comic script with a page and panel outline in Script Studio.",caption:"The Pomegranate Accord in the Greek Demo: comic pages, panels and dialogue beside the First Draft outline. Script Studio is currently built for comics and graphic novels."},
 librarian:{src:"assets/greek-librarian.png",alt:"Seasonal Compact in the Greek Demo beside the Librarian Review actions.",caption:"The Greek Demo’s Seasonal Compact beside the Librarian’s four Review options. Choose your own local Ollama model to begin; source edits still need your acceptance."}
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
let pendingRequestId;
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
  if(!pendingRequestId) pendingRequestId=crypto.randomUUID();
  function hidden(name,value){
   let input=form.querySelector('input[name="'+name+'"]');
   if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.appendChild(input);}
   input.value=value;
  }
  hidden('request_id',pendingRequestId);
  hidden('_url',location.origin+location.pathname);
  if(config.requestWebhook) hidden('_webhook',config.requestWebhook);
  // Standard navigation lets FormSubmit perform its own verification without
  // depending on a cross-origin AJAX response. Do not claim delivery here.
  form.action=config.requestEndpoint;form.method="POST";
  submit.disabled=true;submit.textContent="Opening verification…";
  status.textContent="Continuing to FormSubmit to verify and send your request…";
  try{form.submit();}
  catch{submit.disabled=false;submit.textContent="Send request";status.classList.add("error");status.textContent="The request could not be opened. Your message is still here. Please try again.";}
 });
 // A back-navigation can restore the page while the submit button is disabled.
 window.addEventListener('pageshow',()=>{submit.disabled=false;submit.textContent="Send request";status.textContent="";});
}
