# 127 — Refine the garden menu design

Status: resolved

Refine the full-screen public menu's colours, alignment, layout and title. Keep its pixel garden style, wooden signs, smaller nested items, long-menu scrolling and existing link/disclosure interactions. Check desktop and mobile, then deploy under standing authorization.

## Answer

Replaced the distant generic title with a centred seedling, small garden name and forest-green “Explore the garden” heading. The full-screen surface now uses the shared warm cream with faint existing plant artwork. Signs form a compact 480px stack directly under the title, with slimmer connectors, balanced label padding and a dark-green close control. Child signs remain smaller. Mobile titles wrap safely; landscape uses a shorter heading area.

## Verification

Four existing desktop/mobile browser checks passed: link navigation, disclosure-first parent links, smaller child signs, long-menu scrolling, visible close control, Escape and return focus. Visually reviewed 1440px desktop and 320px mobile screenshots; mobile scroll width equals viewport width. Updated existing dialog-name expectations and stale menu colour assertions. Production build and TypeScript pass. No link destinations, stored navigation or database schema changed.
