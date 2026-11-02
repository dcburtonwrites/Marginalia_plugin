import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const children=[],views=[],requested=[],factories=new Map();
class Plugin {
  constructor(app,manifest){this.app=app;this.manifest=manifest;}
  async loadData(){return {workspace:{modules:{theme:true,scripts:true,librarian:true}},timeline:{enabled:true}};}
  addSettingTab(){}
  registerView(type,factory){views.push(type);factories.set(type,factory);}
  addChild(child){children.push(child.constructor.name);return child;}
}
class SettingTab{constructor(app,plugin){this.app=app;this.plugin=plugin;}}
const obsidian={Plugin,PluginSettingTab:SettingTab,ItemView:class{constructor(leaf){this.contentEl=leaf.contentEl;}},Component:class{},
  MarkdownView:class{},WorkspaceLeaf:class{},Modal:class{},FuzzySuggestModal:class{},
  TFile:class{},TFolder:class{},Setting:class{},Notice:class{},Platform:{isMobile:true},
  addIcon(){},editorInfoField:{}};
const module={exports:{}};
vm.runInNewContext(await readFile('main.js','utf8'),{
  module,exports:module.exports,console,AbortController,URL,Intl,Date,setTimeout,clearTimeout,
  document:{body:{classList:{toggle(){}}},createElement:()=>({})},
  require(name){requested.push(name);
    if(name==='obsidian')return obsidian;
    if(/^@(?:codemirror|lezer)\//.test(name))return require(name);
    throw new Error('Unavailable on mobile: '+name);
  },
},{filename:'main.js'});
const app={workspace:{getLeavesOfType:()=>[]}};
const plugin=new module.exports.default(app,{id:'marginalia'});
await plugin.onload();
assert.deepEqual(children,['ScriptFeature','WorkspaceFeature']);
assert.deepEqual(views,['marginalia-world-timeline','marginalia-entry-timeline','marginalia-librarian','marginalia-expansion']);
assert.equal(plugin.workspaceSettings.modules.librarian,true);
assert.equal(plugin.timelineSettings.enabled,true);
assert.equal(plugin.timelineFeature,undefined);
assert.equal(requested.some(name=>name.startsWith('node:')),false);
assert.equal(JSON.parse(await readFile('manifest.json')).isDesktopOnly,false);
for (const [type,factory] of factories) {
 let rendered;
 const view=factory({contentEl:{ownerDocument:{createElement:()=>({})},replaceChildren(node){rendered=node;},append(node){rendered=node;}}});
 await view.onOpen();
 assert.match(rendered.textContent,type.includes('timeline')?/World vault on desktop/:/desktop only/);
}
await assert.rejects(()=>plugin.checkConnection(),/desktop only/);
await assert.rejects(()=>plugin.generateText('','',new AbortController().signal),/desktop only/);
const result={mobileBundleLoad:'pass',mobileStartup:'pass',restoredDesktopMessage:'pass',children,restoredDesktopViews:views,nodeImportsRequested:[],savedDesktopLibrarianPreference:true,savedDesktopTimelinePreference:true,timelineInactive:true,physicalDeviceTested:false};
await writeFile('docs/verification/mobile-load.json',JSON.stringify(result,null,2)+'\n');
console.log('Mobile bundle loads and starts without Node imports; AI stays inactive.');
