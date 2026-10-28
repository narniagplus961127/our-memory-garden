# 00: Validate the Puck editor during design

## What to build

Create a disposable, local-only Puck experiment using sample content. Review it together with the corrected FigCraft design before approving ticket 01 or starting full implementation.

## Blocked by

- None (can start immediately)

## Status

resolved

## Acceptance criteria

- [ ] On desktop and mobile, try adding and editing text and an image placeholder, using sections and columns, moving blocks with touch-friendly alternatives, and changing canvas size.
- [ ] Simulate automatic saving, failure, retry and same-device recovery with local sample data. Do not claim this validates Supabase persistence, private access or network security.
- [ ] Record what works and what fails; resolve or discuss significant gaps before ticket 01 is approved.
- [ ] Keep the experiment clearly separate from production and document how to run it.

## Experiment findings — awaiting owner review

A local Puck 0.21.3 experiment is available under work/puck-experiment. It uses sample content and local browser storage only. Start it with npm run dev in that folder.

Observed: text can be selected and edited; top-level text, image placeholder, section and two-column blocks can be added via buttons; top-level move buttons reorder blocks; desktop/mobile canvas selection changes the displayed canvas; simulated save failure reports failure, unsaved sample changes were recovered after a reload, and retry reports a simulated local save. A Vite production build completed.

Open gaps: nested blocks currently rely on drag controls, the compact mobile editor has cramped/nested scrolling and needs a real phone-size usability test, and adding/moving nested content by non-drag controls has not been verified. Actual mobile touch dragging, complete section/column editing, and desktop drag interaction still need hands-on validation. The experiment does not verify Supabase, authentication, private access, real network failures or multi-user conflicts. No full application test suite or TypeScript configuration exists for this throwaway JavaScript experiment.

Owner review and the unresolved mobile/nested interaction gaps prevent treating ticket 00 as complete or approving ticket 01. This folder is not a Git repository, so a throwaway branch/commit cannot be created yet.


## Owner review

The owner accepted the experiment as good enough and authorized pushing completed features to GitHub. The recorded nested-control and mobile-usability limitations remain for implementation. This acceptance closes the experiment review; it does not establish production guarantees or final design approval. Source capture: branch prototype/puck-editor, folder prototypes/puck-experiment.

