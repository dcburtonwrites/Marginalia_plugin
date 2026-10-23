# Canon writing process

Status: Phase 7 production writing integration, 2026-10-11 (D-0096). D-0094 accepts the Character approach on both Gemma E4B and 12B at approximately 75/100. The app bundles the accepted Character writer and shared canon writer/profiles for Enhancement and Expansion. Model quality remains variable, particularly attribution and sparse Systems.

## Shared process

1. Identify the target by resolved note path, declared titles and aliases, canon type and subtype. An ambiguous identity needs clarification rather than merged subjects. Read the selected template's sections and useful existing target sections.
2. Gather the target, incoming and outgoing links, explicit name/alias mentions, panel descriptions and nearby scene context. Retain source paths, named actors, project scope, chronology and waking/dream/memory frames. An empty body is not empty evidence when linked material exists.
3. Keep original passages rather than repeatedly rewriting them into claims. Pack relevant scenes and lore with source IDs; keep a host-side audit of selected and omitted material. Repeated presentation headers must not crowd out relevant content.
4. Supply the common writer brief and the matching type/subtype guidance. Standard entries select defining details; expansions develop supported detail within the same entry structure. A larger word allowance does not justify filler or new canon.
5. Return a finished, linked entry draft. Prose should read like the vault's reference notes, not an analytical report or insertion instructions. Omit unsupported sections; blank frontmatter fields are not facts. Distinguish allegations, beliefs and creator proposals from established narration. Put real unresolved disagreements in a brief Notes callout.
6. Keep evidence and quality diagnostics available separately from the lore. The model has no canonical file writer. The existing human editor/Save remains the only path to canon.

The benchmark excludes provisional drafts and external research conservatively. This is not a universal prohibition on brainstorms: an explicit task to turn fragments into lore must include those fragments as provisional material and return a proposed draft. Reference/inspiration material must never silently become in-world fact.

## Type guidance

| Type | What the writer develops | Important distinctions |
|---|---|---|
| Character | Identity, occupation/home or nonhuman purpose, history, abilities, goals, appearance, revealing scenes and relationships | Individual vs species; innate vs equipment-assisted abilities; actor and chronology; latest situation |
| Affiliation | Collective identity and the selected subtype's organization, traits, territory or history | Member vs leader; individual example vs universal species trait; origin vs territory; conditional survival vs lifespan |
| Location | Recognizable geography, atmosphere, inhabitants, history and points of interest | Enduring place properties vs events/observer experiences; creator inspiration vs in-world history |
| System | Supported operation, rules, origin, practitioners and the selected subtype's conditions | Demonstrated application vs universal law; practitioner talent vs system property; no invented mechanisms or costs |
| Event | What happened, participants, supported chronology, causes and consequences | Before vs because; allegation vs established cause; immediate outcome vs prediction |
| Item | Object identity, origin, demonstrated powers/conditions and latest ownership | Maker vs owner vs borrower; wielder ability vs item power; replica vs original |
| Lore | Intelligible history, tradition or knowledge and supported causes/effects | Belief vs fact; cultural effect vs proof of myth; ongoing tradition vs one dated event |

Affiliation variants follow the supplied template: Organization/Group; Species/Race; Government/Nation; Family/Bloodline; Other. System variants: Magic; Technology; Social-Political; Other. Missing subtype uses the template's Other structure, without inferring Magic from a filename. Both `type` and the demo vault's legacy `sub-type` are recognized by the private harness.

The frozen experimental prompts live in `scripts/librarian-benchmark/canon-positive-writer.md` and `canon-profiles.json`. Character keeps its accepted `character-positive-writer.md` unchanged. Template headings are preserved; useful supported custom sections can remain. A Location's Inspiration section is omitted unless there is actual creator provenance to put in it.

## Coverage and integration

Production uses existing headings and matching canon templates together with explicit type/subtype writing guidance. Enhancement and Expansion generate finished Markdown from original passages; the previous extracted-claim reconciliation path is reserved for review work rather than entry writing.

The completed comparison exercises standard and expansion outputs on both models across the remaining six types; see `LIBRARIAN-CANON-TYPE-EXPERIMENT.md` for 42 writing calls, source-role controls and remaining weaknesses. Production integration follows D-0096; the comparison remains a benchmark record, not universal model acceptance. GreekDemo is an engineered demo vault with intentional conflicts, broken links and stubs; it tests application canon, not fidelity to external Greek mythology. No external mythology should fill its gaps or overrule its notes. Small additional fixtures test ownership, allegations and tradition status without relying on pretrained mythology. `canon-type-evaluation.json` contains human review checks and is never an inference input. `prepare_canon_coverage.py` reproduces the preparation from two read-only vaults; `run_ollama.py` and the existing native ignored benchmark run the prepared manifests.

Production shares one retrieval/write process and type profiles across models. Retain model selection and runtime capability limits; the tested 12B MLX model runs through Ollama and is not directly loadable by the embedded GGUF backend. User acceptance of Character outputs does not establish acceptance of every new type or backend support.


## Sparse evidence control

A nearly empty target with only one direct statement is a different writing task from a well-supported entry. The experimental sparse route packs the original units that explicitly mention the target, retains their source-note identity, removes unrelated background and requests a short Description/Practitioners draft rather than a full Rules/Origin expansion. It never rewrites a source into a generated claim. `prepare_sparse_control.py` currently requires an actually empty body and explicit direct evidence; it is a controlled test, not proof of a universal threshold. Production applies the short route to an empty target with at most two original target-mention passages, retaining the owning notes' metadata and same-page script context while withholding unrelated background. Its results are in `LIBRARIAN-CANON-TYPE-EXPERIMENT.md`.

Explicit source-role framing is part of the recommended approach: a Character ability list belongs to the Character; neighboring abilities do not become properties of one listed System; a creator/giver is distinct from a practitioner. The matched sparse control fixes this distinction on 12B but not E4B. Length and source quantity alone are insufficient grounding controls. Preserve quantities and units, and never infer an omitted unit. These are production directions and regression targets, not claims of perfect model compliance.

## Production boundaries

The app supplies the writing brief as a separate system message and the task, original-source packet and type/subtype guidance as the user message. Vault instructions remain untrusted data. The default standard target is 450–600 words and expansion 1000–1400; sparse sources call for less. Native writing allows up to 6144 generated tokens, subject to context limits. Neither depth nor word count creates permission to invent facts.

The host retains exact source offsets, source-owner/type and script page/scene labels. It scopes project material, masks longer Character identities, excludes provisional/research/generated sources, selects explicit script mentions with adjacent same-page context, and discloses context omissions. Template sections are expanded through the existing declarative template interpreter; arbitrary Templater code is never executed. The original entry remains untouched. Enhancement offers section additions; Expansion stores a generated sidecar with source stamps. Prior cited expansion artifacts remain readable.

Generated Markdown is checked for usable template sections and bounded size. Existing links resolve through the vault index; unresolved targets become plain display text. These checks establish shape and provenance, not factual correctness. Sources consulted are available separately and are explicitly not sentence verification. Deep Review and Continuity retain their original quotation validation. Canon still requires human Insert/Save.

Model choice is preserved. The embedded runtime supports compatible GGUF models; the Ollama/MLX 12B benchmark does not add an Ollama or MLX production backend. Frozen benchmark prompts, cases and expected distinctions remain under `scripts/librarian-benchmark/`; app packet regressions live in `tests/librarian-writing.test.ts`.

Writing uses a conservative two-UTF-8-bytes-per-token packing estimate with a 10k-token reserve for framing/output. The native backend tokenizes the complete formatted request and checks the exact context limit before generation; an oversized request fails without publishing. This estimate is specific to entry writing and does not change the stricter review batching.
