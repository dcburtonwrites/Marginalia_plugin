"""Build an isolated, redistributable demo vault. Never reads or edits a user vault."""
from pathlib import Path
import json, shutil, re, hashlib
from zipfile import ZipFile, ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
NAME='Marginalia Greek Demo'
VAULT=ROOT/'dist/greek-demo'/NAME
VAULT.mkdir(parents=True,exist_ok=True)
notes=[]
written=set()
def put(path,text):
 target=VAULT/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(text,encoding='utf8');written.add(target)
def note(path,kind,body,**fields):
 fields={'type':kind,'tags':[kind.lower().replace(' ','-'),'greek-demo'],**fields}
 text='---\n'+''.join(k+': '+json.dumps(v,ensure_ascii=False)+'\n' for k,v in fields.items())+'---\n\n'+body.strip()+'\n'
 put(path,text);notes.append({'path':path,'name':Path(path).stem,'type':kind,'fields':fields,'tags':fields['tags']})
folders={'Lore':'01 Lore','Character':'02 Character','Affiliation':'03 Affiliation','Event':'04 Event','Item':'05 Item','System':'06 System','Location':'07 Location'}
def path(name,kind='Character'):return folders[kind]+'/'+name+'.md'
def link(name,kind='Character'):return '[['+path(name,kind)[:-3]+'|'+name+']]'
characters=[
 ('Zeus','The ruler asked to arbitrate a conflict his authority helped create.','He wants a settlement that restores harvests without admitting that his court ignored Demeter.','Public authority and private responsibility pull in opposite directions.','Hera','Olympus'),
 ('Hera','The queen who notices whose promises never reach the official record.','She wants agreements witnessed rather than quietly revised.','Her loyalty to the court does not require loyalty to every decision Zeus makes.','Athena','Olympus'),
 ('Poseidon','A sea power whose harbors depend on grain from the land.','He presses for an end to the famine before coastal households turn against the gods.','He treats the crisis as a supply problem until Demeter makes it personal.','Demeter','Eleusis'),
 ('Demeter','A mother and harvest goddess searching for her daughter.','She wants Persephone returned with her wishes heard.','Restoring the fields too early would remove her only effective pressure on Olympus.','Persephone','Eleusis'),
 ('Persephone','A daughter navigating a return between two unequal realms.','She wants a voice in the conditions that govern her movement.','Others call the agreement a rescue or a marriage before asking what she calls it.','Hades','Underworld'),
 ('Hades','The underworld ruler defending a boundary he also crossed.','He wants the seasonal agreement to recognize his realm.','He invokes law while the other parties question whether consent was ever present.','Persephone','Underworld'),
 ('Athena','A strategist who can turn a quarrel into a procedure.','She wants a compact that can survive its first ambiguous case.','A technically precise rule may still reproduce an unfair bargain.','Hermes','Olympus'),
 ('Hermes','A messenger moving between sky, earth and the underworld.','He wants the right message to arrive intact, on time, and with a witness.','Neutral delivery is difficult when he can see the cost of the orders he carries.','Hecate','Crossroads'),
 ('Hecate','A torch-bearing guide who listens where paths divide.','She wants testimony that the court cannot dismiss as rumor.','A guide can show a route without deciding whether someone is free to take it.','Demeter','Crossroads'),
 ('Helios','A witness whose broad view leaves important details unclear.','He wants his testimony treated as complete.','His account names what he saw but leaves when he saw it deliberately vague for the Development exercise.','Hecate','Olympus'),
 ('Apollo','A musician asked to make a public promise memorable.','He wants a song that people can use to hold the court accountable.','A polished refrain can hide the disagreement it was meant to preserve.','Athena','Olympus'),
 ('Hephaestus','A maker asked to give an agreement a durable form.','He wants the compact to be readable outside Olympus.','A perfect inscription cannot repair an unjust instruction.','Hera','Olympus')]
for i,(name,role,want,tension,other,loc) in enumerate(characters):
 note(path(name),'Character',f'''# {name}

{role} This profile belongs to **The Pomegranate Accord**, an original demonstration retelling, not a definitive account of every ancient tradition.

## Desire
{want}

## Pressure and contradiction
{tension}

## Relationships
{link(other)} is the relationship to follow first. {link(loc,'Location')} is a key setting; event properties record particular appearances rather than assuming continuous residence.

## Story use
Look for the difference between what {name} says in public and what a panel can reveal through action. In the comic, let posture, distance and withheld replies carry part of that difference.

## Develop next
What would {name} refuse to compromise, even if that refusal delayed the settlement? Use Entry Development to explore the answer before accepting any proposed changes.
''',icon=f'[[_Assets/Icons/{name}.svg]]',aliases=([name+' of Olympus'] if name in ['Zeus','Hera'] else []))
locations=[('Olympus','Sky and earth','A high council chamber open to the weather. A long table makes every empty seat conspicuous.','Gold against storm-blue; voices overlap before the speaker is shown.'),('Eleusis','Sky and earth','Dry fields surround a household that offers shelter before it understands its guest.','Ochre soil, empty baskets and hands working despite exhaustion.'),('Crossroads','Below and between','A meeting of paths marked by torchlight. It belongs to journeys rather than a single household.','Use repeated compositions: the same stones, a different traveler.'),('Underworld','Below and between','A threshold, a garden and a hall whose hospitality has consequences.','Dark pomegranate red against pale stone; leave space around a refusal.')]
for name,group,desc,visual in locations:
 note(path(name,'Location'),'Location',f'''# {name}

{desc}

## Visual language
{visual}

## Boundaries
A place stays stationary in the timeline. Participant links on events record who appears here; they do not move this location.

## Connected story
The {link('Seasonal Compact','System')} changes who may cross its borders. Compare {link('Demeter')} and {link('Hermes')} in the timeline to see the same participant across locations.
''')
items=[('Pomegranate','A fruit that becomes evidence in an argument about return.','Use one broken fruit as the visual motif. The number of seeds is a choice in this retelling, not a universal version of the myth.'),('Crossroads Torch','A portable light carried between testimony and negotiation.','This item has an explicit Lost date and a later Found event. Inspect its entry timeline around years 7 and 12.'),('Winged Sandals','The messenger’s traveling equipment.','They make Hermes recognizable at a distance; the thread still records appearances rather than measuring travel speed.'),('Harvest Ledger','A household record of seed, grain and promises.','One draft assertion deliberately conflicts with the event record: a useful, labeled Vault Review exercise.')]
for i,(name,desc,detail) in enumerate(items):
 fields={'Calendar':'Mythic Calendar','Created':0}
 if name=='Crossroads Torch':fields['Lost']=7
 body=f'# {name}\n\n{desc}\n\n## Narrative role\n{detail}\n\n## Connections\n'+link('Seasonal Compact','System')+' governs the settlement; '+link('Eleusinian Household','Affiliation')+' bears its material costs.\n\n'
 if name=='Harvest Ledger':body+='## Deliberate draft inconsistency\nThis draft claims the ledger stayed at Eleusis throughout years 6–8. The event **The empty granary petition** at year 7 explicitly places it at Olympus. Both are intentionally present so Vault Review has a source-linked continuity question to investigate. Fix one version if you want a clean exercise vault.\n'
 note(path(name,'Item'),'Item',body,**fields,icon=f'[[_Assets/Icons/{name}.svg]]')
for name,desc in [('Olympian Court','The council that has the power to decide but must learn to record disagreement.'),('Eleusinian Household','The mortal household that measures the crisis in meals, labor and planting days.')]:
 note(path(name,'Affiliation'),'Affiliation',f'# {name}\n\n{desc}\n\n## Stake in the accord\nA settlement is not complete until the people living with its costs can describe what changes. Compare the court’s language with the ledger kept at '+link('Eleusis','Location')+'.\n\n## Relationships\n'+link('Demeter')+' challenges the institution; '+link('Hera')+' asks how its promises become public.\n',icon=f'[[_Assets/Icons/{name}.svg]]')
for name,rule,limit in [('Guest Right','A household must offer shelter and a hearing before demanding a guest’s full story.','Hospitality does not give the host ownership of a guest or permission to silence them.'),('Seasonal Compact','Persephone’s crossings and the return of the harvest are negotiated in witnessed terms.','The draft deliberately does not define what happens when a crossing is delayed. This is an Entry Development question, not an implemented rule.')]:
 note(path(name,'System'),'System',f'''# {name}

## Rule in this retelling
{rule}

## Limits and edge cases
{limit}

## Cost
Who carries food through a delay? Who records a refusal? A rule that has no cost for its most powerful party may create a predictable loophole.

## Story evidence
Read {link('Demeter')}, {link('Persephone')} and {link('Hermes')} together. Review the event timeline before treating an implication as an established fact.

## Development prompt
Ask the Librarian to compare the stated rule with how it is used in the sample scripts. Keep suggested solutions provisional until you choose one.
''',icon=f'[[_Assets/Icons/{name}.svg]]')
# Distinct appearances, designed around a coherent original adaptation.
events=[
 ('The council before the silence','Olympus',['Zeus','Hera','Athena','Olympian Court'],'The court hears an ordinary petition. Demeter’s empty chair is initially treated as a scheduling problem.'),
 ('The missing daughter','Eleusis',['Demeter','Hecate','Crossroads Torch'],'Demeter brings a question to a household that has no answer. Hecate offers light rather than a verdict.'),
 ('A witness at the crossing','Crossroads',['Hecate','Helios','Hermes','Crossroads Torch'],'Helios reports what he saw; Hermes asks which words can be carried as testimony.'),
 ('Terms in the garden','Underworld',['Persephone','Hades','Pomegranate'],'Persephone refuses to let a description of the garden substitute for an answer about leaving.'),
 ('The closed furrow','Eleusis',['Demeter','Poseidon','Eleusinian Household','Harvest Ledger'],'The household records a failed planting. Poseidon discovers that coastal trade cannot replace a harvest.'),
 ('The first commission','Olympus',['Zeus','Hermes','Winged Sandals','Olympian Court'],'Zeus commissions a message. Hermes asks whether he is being sent with an order or a proposal.'),
 ('The listening threshold','Crossroads',['Hermes','Hecate','Guest Right','Winged Sandals'],'At the threshold, the messenger practices hearing a refusal without rewriting it.'),
 ('The empty granary petition','Olympus',['Demeter','Hera','Harvest Ledger','Olympian Court'],'Demeter brings the household ledger to Olympus. Its presence here contradicts the labeled draft claim in the item entry.'),
 ('A message below','Underworld',['Hermes','Persephone','Hades','Winged Sandals'],'Hermes delivers the proposal without claiming that its delivery makes it fair.'),
 ('The maker of witnesses','Olympus',['Athena','Hephaestus','Apollo','Seasonal Compact'],'Athena asks for a compact that can be read aloud and checked against what actually happens.'),
 ('The garden accounting','Underworld',['Persephone','Hades','Pomegranate','Seasonal Compact'],'A small fruit becomes a large argument. Persephone insists that the record distinguish eating from agreeing.'),
 ('A household hears the terms','Eleusis',['Demeter','Poseidon','Eleusinian Household','Guest Right'],'The proposed settlement is read where the crisis is lived. Its missing provision for a delayed crossing becomes obvious.'),
 ('The torch returned','Crossroads',['Hecate','Hermes','Crossroads Torch'],'Hecate recovers the torch at the crossing. The Found property restores its recorded presence after the explicit Lost date.'),
 ('The witnessed crossing','Crossroads',['Persephone','Hermes','Hecate','Seasonal Compact'],'Persephone crosses with a witness and speaks for herself. The compact records the words rather than interpreting her silence.'),
 ('The first green shoot','Eleusis',['Demeter','Persephone','Harvest Ledger','Eleusinian Household'],'The field changes before the council’s official celebration. Mother and daughter do not agree on every word of the settlement.'),
 ('The public inscription','Olympus',['Zeus','Hera','Athena','Hephaestus','Apollo','Helios','Seasonal Compact'],'The court receives a readable version of the compact, including the disagreement it would prefer to omit.'),
 ('The season of departure','Underworld',['Persephone','Hades','Pomegranate'],'A later departure tests whether the agreement can be practiced without repeating the original coercion.'),
 ('The field after the promise','Eleusis',['Demeter','Poseidon','Eleusinian Household','Harvest Ledger'],'The household records a new planting. An accord becomes real through repeated work, not a single announcement.')]
participant_types={n:'Character' for n,*_ in characters}|{n:'Item' for n,*_ in items}|{'Olympian Court':'Affiliation','Eleusinian Household':'Affiliation','Guest Right':'System','Seasonal Compact':'System'}
for i,(name,loc,cast,synopsis) in enumerate(events):
 fields={'Calendar':'Mythic Calendar','Locations':[link(loc,'Location')],'Date':i}
 if i==9:fields.pop('Date');fields|={'Start':8,'End':9}
 for kind,key in [('Character','Characters'),('Item','Items'),('Affiliation','Affiliations'),('System','Systems')]:
  values=[link(n,kind) for n in cast if participant_types[n]==kind]
  if values:fields[key]=values
 if i==7:fields['Lost']=[link('Crossroads Torch','Item')]
 if i==12:fields['Found']=[link('Crossroads Torch','Item')]
 if i>0:fields['Preceded By']='[[04 Event/'+events[i-1][0]+']]'
 note(path(name,'Event'),'Event',f'''# {name}

{synopsis}

## Scene objective
Change what the characters can truthfully say after the encounter. Let a physical object or a changed position carry the turn instead of explaining it twice.

## Recorded participation
{', '.join(link(n,participant_types[n]) for n in cast)} appear at {link(loc,'Location')}. Links record appearances, not continuous residence or an inferred travel route.

## Adaptation note
Year {i} is an illustrative story coordinate for this demo. It is not an ancient Greek historical date or a claim that myth traditions share this chronology.
''',**fields)
note(path('The promise before it had words','Event'),'Event','# The promise before it had words\n\nAn undated conversation between Demeter and Persephone. Place it emotionally before the search without assigning a year. The predecessor chain below demonstrates read-only undated ordering.\n',Characters=[link('Demeter'),link('Persephone')],Locations=[link('Eleusis','Location')])
note(path('A story told at the threshold','Event'),'Event','# A story told at the threshold\n\nHecate repeats part of the undated promise. This follows another undated event without inventing an absolute date.\n',Characters=[link('Hecate'),link('Hermes')],Locations=[link('Crossroads','Location')],**{'Preceded By':'[[04 Event/The promise before it had words]]'})
note('01 Lore/Mythic Calendar.md','Calendar','# Mythic Calendar\n\nYears 0–17 mark the sequence of this original demo retelling. These are narrative coordinates, not BCE dates, an ancient calendar reconstruction or a definitive chronology of Greek myth. A year-only label begins at the start of its internal year.\n',primary=True,precision='year',format='{year}')
note('01 Lore/Household Calendar.md','Calendar','# Household Calendar\n\nA second illustrative display: household year 0 corresponds to mythic year 4, the first recorded failed planting. Switch display calendars in the timeline View controls.\n',primary=False,precision='year',format='{year}',anchor='0 Household Calendar = 4 Mythic Calendar')
note('01 Lore/Adaptation and sources.md','Lore','''# Adaptation and sources

This vault is an original, abbreviated Greek-mythology-inspired teaching retelling. The council scenes, ledger, written compact, dialogue and precise order are invented for the demo. Myths have multiple ancient versions; this is not a reconstruction of a single source.

The central material is the Demeter–Persephone tradition: separation, search, the interruption of fertility and a negotiated return. The scripts treat abduction and unequal power as subjects for critical adaptation, without graphic scenes.

## Background reading
- [Greek Gods and Religious Practices — Metropolitan Museum of Art](https://www.metmuseum.org/fr/essays/greek-gods-and-religious-practices): background on the Olympian gods and their attributes.
- [Art and Myth: The Gods in the Prado](https://www.museodelprado.es/en/whats-on/exhibition/art-and-myth-the-gods-in-the-prado/5359d554-e6a6-44d3-8dc1-93d576bf7c99): mythology’s varied literary and visual traditions.
- [Homeric Hymn to Demeter — Theoi](https://www.theoi.com/Text/HomericHymns1.html#2): an ancient-source starting point; consult translations and scholarship rather than assuming the demo’s inventions are ancient details.

No modern translation is reproduced here. All demo prose, comic dialogue and symbol icons are newly written for this vault. The two calendars are invented teaching coordinates.
''')
project='08 Projects/The Pomegranate Accord'
note(project+'/The Pomegranate Accord.md','Project','# The Pomegranate Accord\n\nA short comic and graphic-novel demonstration about who gets to record an agreement. Follow the negotiation through objects: a torch, a ledger and a pomegranate.\n\n## Reading order\n[[08 Projects/The Pomegranate Accord/Scripts/01 The empty chair|The empty chair]] → [[08 Projects/The Pomegranate Accord/Scripts/02 The threshold|The threshold]] → [[08 Projects/The Pomegranate Accord/Scripts/03 A field of witnesses|A field of witnesses]].\n\n## Try it\nChoose this project in Script Studio. Expand pages and panels, try a dialogue shortcut in the sandbox script, then compile the First Draft grouping. These are comic scripts, not prose-chapter samples.\n',role='project',stage='Draft',tags=['project-parent','greek-demo'])
scenes=[('01 The empty chair','Olympus',[('The empty place','A wide council table. One seat faces the window; no one occupies it.','HERA','Are we waiting for her, or waiting for her to stop asking?'),('The inventory','Athena turns a tablet toward Zeus. The list contains weather, stores and three unanswered messages.','ATHENA','The field is not an argument we can adjourn.'),('A reply before the question','Zeus reaches for the seal. Hermes does not reach for the message.','HERMES','Tell me whether I carry an order or a proposal.')]),('02 The threshold','Crossroads',[('The light','Hecate holds the torch low enough to show the worn threshold. Hermes stops short of crossing.','HECATE','A path is not the same thing as permission.'),('What the letter leaves out','Close on the seal, unbroken. Behind it, a second doorway remains dark.','HERMES','Then I will begin by asking.'),('The voice beyond','Persephone stands inside the doorway. Do not frame her only through Hermes’s reaction.','PERSEPHONE','Begin by listening.')]),('03 A field of witnesses','Eleusis',[('The ledger','Demeter sets the ledger on a rough table. The household has brought bowls, not ceremonial vessels.','DEMETER','Read it where the hunger happened.'),('The first line','Persephone moves the ledger between them, leaving room for a second hand.','PERSEPHONE','And leave a place for what we have not agreed.'),('A change in the ground','Wide final panel: a small green shoot at the edge of the field. No council chamber is visible.','HERA','A promise should survive the person who announces it.')])]
for i,(title,loc,panels) in enumerate(scenes):
 body=''
 for page,(pname,visual,speaker,speech) in enumerate(panels,1):
  body+=f'## Page {page}\n\nSide: '+('Right' if page%2 else 'Left')+f'\n\n> [!panel] {pname}\n> {visual}\n\n**{speaker}:** {speech}\n\nLocation: {link(loc,"Location")}\n\n'
  if page==2:body+='> [!note] Lettering and rhythm\n> Let the pause between panels carry the hesitation. Keep this production note out of the final PDF using Content Selections if desired.\n\n'
 note(project+'/Scripts/'+title+'.md','Script',body,role='manuscript',format='comic-script',Project=project,Group='First Draft',Pages=3,Characters=[link(n) for n in ['Demeter','Persephone','Hermes','Hecate','Zeus','Hera','Athena']],**{'Preceded By':('' if i==0 else '[['+project+'/Scripts/'+scenes[i-1][0]+']]')})
note(project+'/Scripts/Shortcut sandbox.md','Script','''# Shortcut sandbox

This separate Practice grouping is safe to edit. Open it in the native editor, type a command alone on a new line, and press Enter. Try /P, /p and /d. Accept a character, write dialogue, and Undo once to observe the conversion boundary.

## Page 1

Side: Right

> [!panel] Your scene
> A blank stone tablet rests beside the torch. What message would you leave?

**HERMES:** This line is yours to change.
''',role='manuscript',format='comic-script',Group='Practice',Pages=1,Characters=[link('Hermes'),link('Hecate'),link('Persephone')],**{'Preceded By':''})
note(project+'/Outline/Story spine.md','Lore','# Story spine\n\n## Act I — An absence\nAn empty chair becomes an empty field. The court’s procedure cannot solve a problem it refuses to name.\n\n## Act II — A hearing\nThe messenger learns to preserve a refusal. A small fruit and a missing clause expose the distance between a bargain and consent.\n\n## Act III — A record\nThe household hears the terms, asks what happens on the difficult day, and records what remains unsettled.\n\n## Development exercise\nThe compact has no delay rule. Decide whether the next scene should test a delay, dispute a witness, or change who is allowed to amend the text.\n')
walks=[('00 Start here','Welcome to your Greek writing desk','''This is a complete, editable sample vault for Marginalia 0.5.0. It includes the plugin itself, Obsidian layout, configured World routes/templates, a linked mythology retelling, a comic project and a populated timeline.

## First opening
Unzip the download, choose **Open folder as vault** in Obsidian and select **Marginalia Greek Demo**, not its parent folder. If Obsidian asks, review and enable community plugins for this demo, then enable Marginalia. Do not merge the hidden .obsidian folder into an existing vault.

The saved layout opens Marginalia Home. Its **Pinned References** contains this tour and the four feature walkthroughs. If plugin tabs are not restored while community plugins are disabled, open **Marginalia: Open Home** after enabling it. This note is also open in a fallback tab.

## A ten-minute tour
1. Open [[00 Brainstorms/Walkthrough/01 Your World|Your World]] and explore Canon.
2. Try [[00 Brainstorms/Walkthrough/02 Script Studio|Script Studio]] and the sample comic.
3. Follow [[00 Brainstorms/Walkthrough/03 Timeline and Threads|Timeline and Threads]] across four locations.
4. Read [[00 Brainstorms/Walkthrough/04 Librarian|Librarian]] before choosing a local model.

The story is an original adaptation, with invented chronology and explicitly labeled continuity exercises. Read [[01 Lore/Adaptation and sources]]. No model, private user data, generated report or external service credentials are bundled.
'''),('01 Your World','Your World: meet the cast','''## See it
Use the app navigation to open **Canon**, then choose Characters, Locations, Items or Systems. Open [[02 Character/Demeter]], follow her link to [[02 Character/Persephone]], and compare their desires. Use Backlinks to see the same entries referenced by events and scripts.

## Try it
Open [[06 System/Seasonal Compact]] and identify the missing rule. Make a provisional idea in Brainstorms before changing Canon. Use **New Entry** to create a Character from the configured template; cancel if you only want to inspect the form.

## Notice
Canon is the established material for this retelling. Brainstorms holds your alternatives and these walkthroughs. The pinned tour is not mythology evidence. Projects holds the comic, its outline and manuscript scripts. Templates and icons have their own excluded folders.

## Checkpoint
Can you find the same character through Canon, a scene link and a script? Return with **Open Home** and choose the next pinned walkthrough.
'''),('02 Script Studio','Script Studio: write a comic','''## See it
Use the **M ribbon** or **Open Script Studio**. The selected project is **The Pomegranate Accord**. Choose **First Draft** to see its three ordered comic scripts; expand a script, then its pages and panels.

Open [[08 Projects/The Pomegranate Accord/Scripts/01 The empty chair]]. Read the page/panel structure, character dialogue, setting links and a production callout. This workflow is currently built for comics and graphic novels.

## Try it safely
Choose the **Practice** grouping and open [[08 Projects/The Pomegranate Accord/Scripts/Shortcut sandbox]]. Switch to editing, type `/d` alone on a fresh line and press Enter. Choose Hermes, replace the dialogue placeholder and try Undo. `/P` creates a page; `/p` creates a panel. Case matters.

## Read and export
Return to **First Draft**. Click the project name for continuous reading. Choose **Compile PDF…**, preview the three scripts, toggle production notes and title page, and export on desktop if you wish. The Practice grouping is separate, so experiments do not join the sample comic automatically.

## Writing tools
The sidebar timer is set to 25 minutes and the daily goal to 300 new words. Counts start with your edits, not the bundled prose. Focus mode is off so the first tour is visually stable; enable it in Scripts settings when you want to try it. Session history is optional and starts empty.
'''),('03 Timeline and Threads','Timeline and Threads: follow the messenger','''## See it
Choose the already-open **World Timeline** tab, or use its ribbon. Threads and entry images are enabled in the saved tab. The four lanes are grouped into **Sky and earth** and **Below and between** with different colors.

## Follow Hermes
Open Filters, type Hermes and choose his Canon chip. Single-click a participant marker or line to hold the highlight; double-click to open his entry timeline. His appearances cross Olympus, the Crossroads and the Underworld. Zoom in: connections continue toward known offscreen appearances. Remove the chip to see the whole cast again.

## Compare and rearrange
Add Demeter as another chip: selected entries match any chip. In **View → Locations…**, drag a lane, click a group to edit it and inspect the color choices. Use your trackpad horizontally to pan. Fit resets the range.

## Inspect evidence
Open [[05 Item/Crossroads Torch]] and its entry timeline. Its own **Lost: 7** overrides an event-supplied loss; **The torch returned** records Found at year 12. Use **Snapshot at time…** before and after that event and inspect the evidence. Unknown is not the same as absent.

The two undated scenes stay below dated time. One follows the other by a predecessor link without acquiring an invented date. **Household Calendar** offers a second anchored display, with year zero at mythic year 4.

## Meaning of these dates
Years 0–17 are invented story coordinates, not ancient historical dates. The council scenes and compact are adaptation choices. Threads record appearances, not continuous presence or travel speed.
'''),('04 Librarian','Librarian: question the story','''## Optional setup
The rest of this vault works without AI. For the Librarian, install Ollama and a suitable model on your desktop, then choose the installed model under **Settings → Marginalia → Librarian**. No model is bundled or automatically downloaded. This demo leaves model selection blank rather than assuming a model exists on your computer.

## Ask
Open [[02 Character/Persephone]], then the lantern. Ask: “What does this entry want that the draft scenes do not yet let her say? Cite the original entries you use.” Inspect the reference list and source limits rather than treating a confident answer as proof.

## Review an entry
With [[06 System/Seasonal Compact]] open, choose **Review → Entry Development**. Discuss the missing delayed-crossing rule. Let the questions adapt; this is not a fixed interview. Choose **End Development** when ready, then accept or dismiss individual changes. The author conversation defaults to **Brainstorms/Development**.

Try Enhancement for a targeted addition, or Expansion for a separate source-linked synthesis. Original text changes only when you explicitly accept a proposal.

## Review the vault
Run **Vault Review**. One deliberate continuity problem is the [[05 Item/Harvest Ledger]] claiming it stayed at Eleusis during years 6–8 while [[04 Event/The empty granary petition]] places it at Olympus in year 7. A reasoning review can question whose account is wrong and what scene would resolve it; this is different from a mechanical date check.

AI-only reports save under **.marginalia/reviews** and open through **Library**. No pre-generated AI results are planted here. Model responses depend on your chosen model and context; a particular finding is not guaranteed.
''')]
for filename,title,body in walks:note('00 Brainstorms/Walkthrough/'+filename+'.md','Brainstorm','# '+title+'\n\n'+body)
note('00 Brainstorms/What if the crossing is delayed.md','Brainstorm','# What if the crossing is delayed?\n\nAn author’s provisional idea: the household stores one extra season of grain, but neither court can use that reserve to force Persephone’s movement. Would a witness be enough to enforce the limit?\n\nThis is not Canon. Develop it against [[06 System/Seasonal Compact]] and [[08 Projects/The Pomegranate Accord/Outline/Story spine]] before accepting it into the story.\n')
# Local, code-native symbol illustrations: no stock images, copied portraits or remote URLs.
for i,name in enumerate(participant_types):
 initials=''.join(w[0] for w in name.split())[:2];colors=['#d5ae63','#91b5c7','#b6a2c8','#97b69b'];color=colors[i%4]
 put('_Assets/Icons/'+name+'.svg',f'<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="44" fill="#162538" stroke="{color}" stroke-width="3"/><path d="M24 63L36 25L48 45L60 25L72 63" fill="none" stroke="{color}" stroke-width="2"/><text x="48" y="78" font-family="Georgia,serif" font-size="19" text-anchor="middle" fill="{color}">{initials}</text></svg>')
for kind in folders:
 note('_templates/Canon/'+kind+'.md',kind,f'# New {kind}\n\n## Overview\n\n## Relationships\n\n## Questions to develop\n',**({'Calendar':'Mythic Calendar','Date':'','Locations':[],'Characters':[]} if kind=='Event' else {}))
note('_templates/Brainstorm.md','Brainstorm','# Working idea\n\n## Possibility\n\n## What would this change?\n\n## Keep provisional until\n')
for name in ['Project Parent','Plot','Plot Point','Project Note']:
 note('_templates/Project/'+name+'.md','Project' if name=='Project Parent' else 'Lore','# New '+name+'\n\n## Purpose\n\n## Connections\n',**({'role':'project','tags':['project-parent']} if name=='Project Parent' else {}))
note('_templates/Project/Script.md','Script','## Page 1\n\nSide: Right\n\n> [!panel] Opening image\n> Describe what the reader sees.\n\n**HERMES:** Dialogue.\n',role='manuscript',format='comic-script',Group='First Draft',Pages=1,**{'Preceded By':''})
settings={'endpoint':'http://127.0.0.1:11434','model':'','context':8192,'workspace':{'modules':{'theme':True,'scripts':True,'librarian':True},'vaultType':'World','colors':True,'navigation':True,'hiddenFolders':['_Assets','_templates'],'pins':['00 Brainstorms/Walkthrough/'+w[0]+'.md' for w in walks],'recents':['00 Brainstorms/Walkthrough/00 Start here.md',project+'/Scripts/01 The empty chair.md','02 Character/Persephone.md'],'canonTypes':[{'name':kind,'folder':folder,'projectFolder':kind,'template':'_templates/Canon/'+kind+'.md'} for kind,folder in folders.items()]},'timeline':{'enabled':True,'primaryCalendar':'01 Lore/Mythic Calendar.md','displayCalendar':'01 Lore/Mythic Calendar.md','iconField':'icon','lanes':[{'path':path(name,'Location'),'group':group,'enabled':True} for name,group,*_ in locations],'groups':[{'name':'Sky and earth','style':'blue'},{'name':'Below and between','style':'purple'}]},'writing':{'selection':{'scope':project,'group':'First Draft'},'preferences':{'scriptTemplate':'_templates/Project/Script.md','showTimer':True,'showWordCount':True,'countdownMinutes':25,'goalMode':'all-projects','dailyGoal':300,'sessionHistory':False,'focusMode':False},'history':[],'activeSession':None,'compilationAuthor':'Demo Writer'}}
def leaf(id,type,state,title):return {'id':id,'type':'leaf','state':{'type':type,'state':state,'title':title}}
workspace={'main':{'id':'demo-main','type':'split','children':[{'id':'demo-tabs','type':'tabs','children':[leaf('demo-home','marginalia-pages',{'section':'Home'},'Home'),leaf('demo-welcome','markdown',{'file':'00 Brainstorms/Walkthrough/00 Start here.md','mode':'preview'},'Start here'),leaf('demo-timeline','marginalia-world-timeline',{'threads':True,'threadImages':True,'start':-1,'span':20,'filters':{'entries':[],'query':'','type':'','tag':'','project':''},'selected':''},'World Timeline')],'currentTab':0}],'direction':'vertical'},'left':{'id':'demo-left','type':'split','children':[{'id':'demo-left-tabs','type':'tabs','children':[leaf('demo-files','file-explorer',{},'Files'),leaf('demo-studio','marginalia-scripts',{},'Script Studio')],'currentTab':1}],'direction':'horizontal','width':300,'collapsed':False},'right':{'id':'demo-right','type':'split','children':[{'id':'demo-right-tabs','type':'tabs','children':[leaf('demo-librarian','marginalia-librarian',{},'Librarian')]}],'direction':'horizontal','width':350,'collapsed':True},'active':'demo-home','lastOpenFiles':[]}
for file,data in [('.obsidian/workspace.json',workspace),('.obsidian/plugins/marginalia/data.json',settings),('.obsidian/community-plugins.json',['marginalia']),('.obsidian/core-plugins.json',['file-explorer','global-search','switcher','graph','backlink','outgoing-link','tag-pane','page-preview','templates','note-composer','command-palette','editor-status','bookmarks','outline','word-count','file-recovery','properties']),('.obsidian/app.json',{'readableLineLength':True,'showLineNumber':False,'defaultViewMode':'preview','livePreview':True}),('.obsidian/appearance.json',{'theme':'obsidian','accentColor':'#d5ae63'})]:put(file,json.dumps(data,indent=2)+'\n')
for file in ['main.js','manifest.json','styles.css']:
 source=ROOT/'dist/marginalia'/file
 if not source.is_file():raise SystemExit('Run npm run package first')
 target=VAULT/'.obsidian/plugins/marginalia'/file;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target);written.add(target)
shutil.copyfile(ROOT/'LICENSE',VAULT/'LICENSE.txt');written.add(VAULT/'LICENSE.txt')
put('README.md',f'''# {NAME}

Open this folder as a new vault in Obsidian. Review/enable community plugins if asked, then enable Marginalia. Use the saved Home tab or **Marginalia: Open Home**. Walkthroughs are pinned there; **00 Brainstorms/Walkthrough/00 Start here.md** is a fallback entry point.

Do not merge .obsidian into your existing vault. This folder includes Marginalia 0.5.0, fresh settings, templates, local icons, scripts and original demo prose. No account, model download, private settings, author email, credentials or generated AI output is included. Local Ollama is optional and must be configured separately. Core/Obsidian trust prompts still belong to Obsidian and are not bypassed.

This is an original mythology-inspired adaptation. Its narrative years are invented, not historical chronology. Read **01 Lore/Adaptation and sources.md**. All demo content is supplied under the included MIT license.

You may edit freely. To reset, unzip a fresh copy rather than overwriting your edits. Desktop gives the full tour; timeline/local AI/PDF export have the platform limits described in the walkthroughs.
''')
# Publish only this build's inventory; avoid accidentally including local session/cache files.
files=sorted(written)
archive=ROOT/'website/dist/downloads/marginalia-greek-demo-0.5.0.zip'
with ZipFile(archive,'w',ZIP_DEFLATED) as z:
 for p in sorted(files):z.write(p,NAME+'/'+str(p.relative_to(VAULT)))
manifest={'name':NAME,'version':'0.5.0','notes':notes,'files':{str(p.relative_to(VAULT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},'participants':list(participant_types),'archive':str(archive.relative_to(ROOT))}
(ROOT/'dist/greek-demo-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(f'Greek Demo: {len(notes)} notes, {len(events)} dated + 2 undated events, {len(participant_types)} participants, 4 scripts, 5 pinned walkthroughs; {len(files)} total files.')
