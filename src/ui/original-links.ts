import type {Component} from "obsidian";

/** ItemView Markdown links need an explicit native navigation handler. */
export function bindOriginalLinks(root:HTMLElement,component:Component,open:(target:string)=>void){
  for(const link of root.querySelectorAll<HTMLAnchorElement>('a.internal-link')){
    component.registerDomEvent(link,'click',event=>{
      event.preventDefault();event.stopPropagation();
      const target=link.getAttribute('data-href');
      if(target)open(target);
    });
  }
}
