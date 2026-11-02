# Timeline details dismissal · 2026-11-01

Corrects the Phase 3 selected-event footer: a compact × button closes it, clicking non-interactive chart background clears it, and Escape from chart/details clears it and returns focus to the chart. Event selection preserves keyboard focus after redraw. Buttons and source links remain interactive.

Browser acceptance using the production WorldTimelineUI: selected Arrival displays details; Close event details hides the panel and clears aria-pressed; reopening then clicking the axis/background hides it again; reopening then Escape hides it and focuses the chart. Package/typecheck and preview builds pass. No model/state behavior, version or vault content changes. Updated package is in dist/marginalia; native installed copy was not refreshed during this refinement.
