# Marginalia 0.5.0

A creative workspace inside Obsidian: worldbuilding, comic scripts, timelines and a local AI Librarian.

- **App pages:** Home, Canon, Brainstorms and Projects; World/Storyboard vault types; configurable entry types, templates and folder routes.
- **Timelines:** ordinary Calendar notes, custom signed-year calendars, date spans, location lanes, colored groups, drag ordering, horizontal trackpad panning, multi-entry Canon filters, per-entry histories and snapshots with source evidence. Desktop World vaults only.
- **Threads:** toggle participant connections across event and location lanes, including offscreen continuations. Use local entry images or initials. Click to highlight, double-click for an entry timeline; undated events stay separate.
- **Script Studio:** project/grouping outlines, native page/panel editing, script ordering, dialogue choices, slash shortcuts, focused writing, timer, daily word goals and optional session history. Compile preview and desktop PDF output.
- **Local Librarian:** Ask, source-based Enhancement and Expansion, adaptive Entry Development and source-linked Vault Review. Development conversations default to Brainstorms/Development; AI-only reports stay in .marginalia and open through Library. Source edits require individual acceptance.
- **MIT licensed**, with optional PayPal support. No paid plugin tier.

## Requirements and boundaries

Obsidian 1.8.7+ is the declared minimum; optional Bases integration requires 1.10+. Current native desktop testing used 1.14.5. Minimum-version acceptance still needs a dedicated run before Community submission.

Librarian requires a separately installed local Ollama server and model. There is no cloud fallback or automatic model download. Timelines, Librarian and PDF export are desktop-only; mobile supports app pages, native scripts and script preview. Physical Android, some iOS keyboard/IME interactions, Windows/Linux PDF output and hidden-folder sync need wider verification. Structured timeline editing is deferred.

This package is prepared locally. Community approval, a public GitHub release and the website launch have not happened. Existing uncompleted verification items remain documented in docs/ROADMAP.md.

## Installation

After Community approval: Settings → Community plugins → Browse → Marginalia → Install → Enable.

Until then, unzip `marginalia-0.5.0.zip` and copy its `marginalia` folder into your vault's configuration directory under `plugins` (normally `.obsidian/plugins`). Reload Obsidian and enable the plugin. The folder contains only `main.js`, `manifest.json` and `styles.css`; do not replace your existing `data.json` when updating.
