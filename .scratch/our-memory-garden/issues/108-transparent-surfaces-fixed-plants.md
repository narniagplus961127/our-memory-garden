# 108 — Transparent editor defaults and persistent edge plants

Status: resolved

Default outer blocks/sections and the document canvas to transparent. Offer a transparent palette choice while preserving explicitly saved colours, background images and designed wooden card/photo/counter interiors. Keep plant artwork visible at viewport edges during scrolling, reserve wider-screen content rails like the reference, and preserve mobile readability, editor/public consistency, full-width section behavior within the content frame, viewer access and decorative pointer safety. No destructive rewrite of saved page or template backgrounds.

## Answer

New sections and legacy banners start Transparent; the document canvas is clear. Transparent is a selectable palette value accepted by normal saves and page JSON import/export. Other outer block surfaces already start clear. Explicit palette/custom/content colours, background images, and wooden/paper widget interiors are retained.

The three existing plant arrangements are fixed at public viewport edges. Desktop content reserves plant-width side rails from 1024px and is capped at 1440px. Tablet/phone content remains full width, with 64px, lower-opacity decoration. The editor previews clear surfaces and the same responsive styling. Decorations remain non-interactive; no assets, packages, storage objects or database migrations were added.

## Verification

- Local editor: insert Section/Text, inspect clear document/section/content surfaces, switch Paper and custom hex colour, return to Transparent, autosave and reload. Passed.
- Local API: save transparent Section/Banner, export and re-import page JSON; intentional paper, sage, dark green and custom colours retained. Passed.
- Public browser at 1920, 1360, 768 and 390px: fixed decoration bounds remain stable while scrolling, no horizontal overflow, decorative pointer events disabled. Screenshots inspected; laptop rails keep plants out of text.
- Existing desktop/mobile Photo Grid editing, section width, full-screen viewer and wooden-card/filter/plant journeys: 6 passed after the final layout adjustment.
- Existing 105-photo keyboard-selection journey: passed after updating two outdated accessible-name assertions to tolerate the deliberately missing fixture thumbnails' “Photo — unavailable” prefix. No product behavior changed for that test correction.
- TypeScript, focused Prettier, diff whitespace and production build passed.

## Limits

Existing pages/templates are not rewritten: stored palette colours may have been intentionally authored and remain visible until an administrator selects Transparent. Full-width sections fill the centered content frame; header/footer remain full viewport width. Small screens use faint background decoration rather than sacrificing reading width. Editor decorations are relative to its preview frame; published-page decoration is fixed to the visitor's viewport. Authenticated editing checks use isolated local services; hosted release checks are anonymous HTTP/asset checks.
