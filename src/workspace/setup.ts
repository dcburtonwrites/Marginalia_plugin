import { Modal, Setting, Notice, TFolder } from "obsidian";
import type Marginalia from "../main.ts";
import { el, button } from "../ui/sidebar.ts";
import { suggest, vaultFiles, vaultFolders } from "../ui/suggest.ts";
import { folderPath, readCanonTypes, readEntrySetup, defaultCanonTypes, defaultEntrySetup, type CanonType } from "./setup-model.ts";

export class VaultSetupModal extends Modal {
  canon: CanonType[];
  setup: ReturnType<typeof readEntrySetup>;
  constructor(private owner: Marginalia) {
    super(owner.app);
    this.canon=structuredClone(owner.workspaceSettings.canonTypes);
    this.setup=structuredClone(owner.workspaceSettings.entrySetup);
  }
  onOpen() { this.draw(); }
  draw() {
    const root=this.contentEl;root.replaceChildren();this.modalEl.classList.add("marginalia-vault-setup");
    root.append(el("h2","","Vault setup"),el("p","marginalia-muted","Map your entry types to folders and templates. Vault folders are relative to the vault; project folders are relative to each project. Leave a template blank for empty notes. Save changes to use them; existing notes are never moved."));
    const field=(value:string,change:(value:string)=>void,label:string,mode?:"folder"|"template")=> {
      const input=el("input");input.value=value;input.setAttribute("aria-label",label);input.oninput=()=>change(input.value);
      if(mode) { const holder=el("span");holder.append(input);suggest(input,()=>mode==="folder"?vaultFolders(this.app):vaultFiles(this.app));return holder; }
      return input;
    };
    root.append(el("h3","","Canon types"));
    const wrapper=el("div","marginalia-setup-table-wrap");
    const table=el("table","marginalia-setup-table");table.setAttribute("aria-label","Canon type routes");
    const header=el("tr");for(const name of ["Type","Vault folder","Project folder","Template",""]) header.append(el("th","",name));table.append(header);
    this.canon.forEach((route,index)=> {
      const row=el("tr");
      const fields=[field(route.name,value=>{route.name=value;},`Canon type ${index+1}`),
        field(route.folder,value=>{route.folder=value;},`${route.name} vault folder`,"folder"),
        field(route.projectFolder,value=>{route.projectFolder=value;},`${route.name} project folder`),
        field(route.template,value=>{route.template=value;},`${route.name} template`,"template")];
      for(const input of fields) { const cell=el("td");cell.append(input);row.append(cell); }
      const action=el("td");action.append(button("Remove",()=>{this.canon.splice(index,1);this.draw();}));row.append(action);table.append(row);
    });
    wrapper.append(table);root.append(wrapper,button("Add canon type",()=>{this.canon.push({name:"",folder:"",projectFolder:"",template:""});this.draw();}));
    new Setting(root).setName("Brainstorm folder").addText(input=> {
      input.setValue(this.setup.brainstorm.folder).onChange(value=>{this.setup.brainstorm.folder=value;});suggest(input.inputEl,()=>vaultFolders(this.app));
    });
    new Setting(root).setName("Brainstorm template").addText(input=> {
      input.setValue(this.setup.brainstorm.template).onChange(value=>{this.setup.brainstorm.template=value;});suggest(input.inputEl,()=>vaultFiles(this.app));
    });
    new Setting(root).setName("Projects folder").setDesc("Use / for projects directly in the vault, as in a Storyboard vault.").addText(input=> {
      input.setValue(this.setup.projectsFolder).onChange(value=>{this.setup.projectsFolder=value;});suggest(input.inputEl,()=>vaultFolders(this.app));
    });
    root.append(el("h3","","Project entry options"));
    const projectTable=el("table","marginalia-setup-table");projectTable.setAttribute("aria-label","Project entry routes");
    const head=el("tr");for(const name of ["Subtype","Folder within project","Template"]) head.append(el("th","",name));projectTable.append(head);
    for(const route of this.setup.projectOptions) {
      const row=el("tr");row.append(el("th","",route.name));
      const destination=el("td");destination.append(field(route.folder,value=>{route.folder=value;},`${route.name} folder`));
      if(route.name==="New Project") destination.textContent="Uses Projects folder + title";
      const template=el("td");template.append(field(route.template,value=>{route.template=value;},`${route.name} template`,"template"));row.append(destination,template);projectTable.append(row);
    }
    const projectWrapper=el("div","marginalia-setup-table-wrap");projectWrapper.append(projectTable);root.append(projectWrapper);
    const error=el("p","marginalia-script-warning");error.setAttribute("role","alert");root.append(error);
    const targets=()=>[this.setup.brainstorm.folder,this.setup.projectsFolder,...this.canon.map(type=>type.folder)].filter(Boolean).map(folderPath);
    new Setting(root).setName("Create configured folders").setDesc("Creates missing vault folders from this table. Does not create project subfolders until you create an entry.")
      .addButton(button=>button.setButtonText("Create missing folders").onClick(async()=> {
        button.setDisabled(true);error.textContent="";
        try {
          for(const folder of targets()) {
            let path="";
            for(const part of folder==="/"?[]:folder.split("/")) {
              path=path?path+"/"+part:part;
              const file=this.app.vault.getAbstractFileByPath(path);
              if(file && !(file instanceof TFolder)) throw new Error(`A file blocks ${path}.`);
              if(!file) await this.app.vault.createFolder(path);
            }
          }
          new Notice("Configured folders are ready.");
        } catch(reason) { error.textContent=reason instanceof Error?reason.message:String(reason); }
        finally { button.setDisabled(false); }
      }));
    new Setting(root).addButton(control=>control.setButtonText("Save setup").setCta().onClick(async()=> {
      control.setDisabled(true);error.textContent="";
      const previous={canon:this.owner.workspaceSettings.canonTypes,setup:this.owner.workspaceSettings.entrySetup};
      try {
        targets();
        for(const route of [...this.canon.map(route=>({folder:route.projectFolder})),...this.setup.projectOptions]) if(route.folder) folderPath(route.folder);
        const canon=readCanonTypes(this.canon);
        if(canon.length!==this.canon.length) throw new Error("Give each canon type a unique, nonempty name, distinct from the built-in entry and project options.");
        this.owner.workspaceSettings.canonTypes=canon;
        this.owner.workspaceSettings.entrySetup=readEntrySetup(this.setup,this.owner.workspaceSettings.vaultType==="Storyboard");
        await this.owner.savePluginData();this.owner.themeFeature?.refresh();this.close();
      } catch(reason) {
        this.owner.workspaceSettings.canonTypes=previous.canon;this.owner.workspaceSettings.entrySetup=previous.setup;
        error.textContent=reason instanceof Error?reason.message:String(reason);
      } finally { control.setDisabled(false); }
    })).addButton(control=>control.setButtonText("Restore defaults").onClick(()=> {
      this.canon=structuredClone(defaultCanonTypes);this.setup=defaultEntrySetup(this.owner.workspaceSettings.vaultType==="Storyboard");this.draw();
    })).addButton(control=>control.setButtonText("Cancel").onClick(()=>this.close()));
  }
  onClose() { this.contentEl.replaceChildren(); }
}
