export interface OutlineDrag {kind:'script'|'page'|'panel';path:string;from?:number;fingerprint?:string;key?:string;}
type Target={accept:(source:OutlineDrag)=>boolean;drop:(source:OutlineDrag,edge:'before'|'after')=>void};
const mime='application/x-marginalia-outline';
/** Pointer dragging avoids Electron native drag-session interference; touch uses deliberate long-press. */
export class OutlineDragging {
  private targets=new WeakMap<HTMLElement,Target>();
  private touchCleanup?:()=>void;
  private mouseCleanup?:()=>void;
  active=false;
  private source?:OutlineDrag;
  constructor(private finished:()=>void=()=>{}){}
  cancel(){this.touchCleanup?.();this.mouseCleanup?.();this.active=false;this.source=undefined;}
  bind(row:HTMLElement,getPayload:OutlineDrag|(()=>OutlineDrag),target:Target,enabled:()=>boolean){
    const doc=row.ownerDocument;
    const payload=()=>typeof getPayload==='function'?getPayload():getPayload;
    row.draggable=false;row.dataset.dragKind=payload().kind;
    row.classList.add('marginalia-drop-target');
    this.targets.set(row,target);
    const clear=()=>row.classList.remove('is-dragging','drop-before','drop-after');
    const edge=(y:number)=>y<row.getBoundingClientRect().top+row.getBoundingClientRect().height/2?'before' as const:'after' as const;
    row.addEventListener('dragstart',event=>{
      if(!enabled()||this.mouseCleanup){event.preventDefault();return;}
      event.stopPropagation();this.active=true;this.source=payload();row.classList.add('is-dragging');
      event.dataTransfer?.setData(mime,JSON.stringify(payload()));
      if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
    });
    row.addEventListener('dragend',()=>{this.active=false;this.source=undefined;clear();doc.querySelectorAll('.drop-before,.drop-after').forEach(node=>node.classList.remove('drop-before','drop-after'));this.finished();});
    row.addEventListener('dragover',event=>{
      if(!enabled()||!event.dataTransfer?.types.includes(mime)||this.source&&!target.accept(this.source))return;
      event.preventDefault();event.stopPropagation();row.classList.remove('drop-before','drop-after');row.classList.add('drop-'+edge(event.clientY));
      event.dataTransfer.dropEffect='move';
    });
    row.addEventListener('dragleave',clear);
    row.addEventListener('drop',event=>{
      event.preventDefault();event.stopPropagation();this.active=false;this.source=undefined;clear();
      if(!enabled())return;
      try{const source=JSON.parse(event.dataTransfer?.getData(mime)||'null');if(source&&target.accept(source))target.drop(source,edge(event.clientY));}catch{/* External/invalid drags change nothing. */}
    });
    row.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='mouse'||event.button!==0||!enabled()||(event.target as HTMLElement).closest('.marginalia-outline-arrow'))return;
      this.cancel();const source=payload(),start={x:event.clientX,y:event.clientY};
      let dragging=false,over:HTMLElement|null=null,position:'before'|'after'='after';
      const cleanup=()=>{clear();over?.classList.remove('drop-before','drop-after');doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',end);doc.removeEventListener('pointercancel',cancel);doc.defaultView?.removeEventListener('blur',cancel);doc.removeEventListener('keydown',key);this.active=false;this.source=undefined;this.mouseCleanup=undefined;this.finished();};
      const cancel=()=>cleanup();
      const key=(event:KeyboardEvent)=>{if(event.key==='Escape')cancel();};
      const move=(event:PointerEvent)=>{
        if(!dragging&&Math.hypot(event.clientX-start.x,event.clientY-start.y)<6)return;
        dragging=true;this.active=true;this.source=source;row.classList.add('is-dragging');event.preventDefault();
        over?.classList.remove('drop-before','drop-after');
        over=doc.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('.marginalia-drop-target')??null;
        if(over&&!this.targets.get(over)?.accept(source))over=null;
        if(over){const rect=over.getBoundingClientRect();position=event.clientY<rect.top+rect.height/2?'before':'after';over.classList.add('drop-'+position);}
        const scroller=row.closest<HTMLElement>('.marginalia-scripts-outline');
        if(scroller){const rect=scroller.getBoundingClientRect();if(event.clientY<rect.top+35)scroller.scrollTop-=18;else if(event.clientY>rect.bottom-35)scroller.scrollTop+=18;}
      };
      const end=(event:PointerEvent)=>{
        const destination=over&&this.targets.get(over);
        if(dragging){
          event.preventDefault();
          const block=(click:Event)=>{click.preventDefault();click.stopImmediatePropagation();};
          doc.addEventListener('click',block,{capture:true,once:true});setTimeout(()=>doc.removeEventListener('click',block,true),0);
        }
        cleanup();if(dragging&&enabled()&&destination?.accept(source))destination.drop(source,position);
      };
      doc.addEventListener('pointermove',move);doc.addEventListener('pointerup',end);doc.addEventListener('pointercancel',cancel);doc.defaultView?.addEventListener('blur',cancel);doc.addEventListener('keydown',key);this.mouseCleanup=cleanup;
    });
    row.addEventListener('touchstart',event=>{
      if(!enabled()||event.touches.length!==1||(event.target as HTMLElement).closest('.marginalia-outline-arrow'))return;
      this.cancel();const source=payload();const touch=event.touches[0],start={x:touch.clientX,y:touch.clientY};
      let dragging=false,over:HTMLElement|null=null,position:'before'|'after'='after';
      const cleanup=()=>{clearTimeout(timer);clear();over?.classList.remove('drop-before','drop-after');doc.removeEventListener('touchmove',move);doc.removeEventListener('touchend',end);doc.removeEventListener('touchcancel',cancel);this.active=false;this.touchCleanup=undefined;this.finished();};
      const timer=setTimeout(()=>{dragging=true;this.active=true;row.classList.add('is-dragging');},450);
      const cancel=()=>cleanup();
      const move=(event:TouchEvent)=>{
        if(event.touches.length!==1){cleanup();return;}
        const point=event.touches[0];
        if(!dragging){if(Math.hypot(point.clientX-start.x,point.clientY-start.y)>8)cleanup();return;}
        event.preventDefault();
        over?.classList.remove('drop-before','drop-after');
        over=doc.elementFromPoint(point.clientX,point.clientY)?.closest<HTMLElement>('.marginalia-drop-target')??null;
        if(over&&!this.targets.get(over)?.accept(source))over=null;
        if(over){const rect=over.getBoundingClientRect();position=point.clientY<rect.top+rect.height/2?'before':'after';over.classList.add('drop-'+position);}
        const scroller=row.closest<HTMLElement>('.marginalia-scripts-outline');
        if(scroller){const rect=scroller.getBoundingClientRect();if(point.clientY<rect.top+35)scroller.scrollTop-=18;else if(point.clientY>rect.bottom-35)scroller.scrollTop+=18;}
      };
      const end=(event:TouchEvent)=>{const destination=over&&this.targets.get(over);if(dragging){event.preventDefault();event.stopPropagation();}cleanup();if(dragging&&enabled()&&destination?.accept(source))destination.drop(source,position);};
      doc.addEventListener('touchmove',move,{passive:false});doc.addEventListener('touchend',end,{passive:false});doc.addEventListener('touchcancel',cancel);
      this.touchCleanup=cleanup;
    },{passive:true});
  }
}
