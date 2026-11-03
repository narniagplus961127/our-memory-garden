# 16: Scroll the desktop navigation while keeping account actions at the bottom

## Status

resolved

## Requested behavior

On desktop, the administration sidebar stays within the viewport. Its branding/navigation area scrolls independently when space is limited. View website, Account and Sign out stay visible at the bottom while the main page or navigation scrolls. Preserve the shared left/right spacing and the existing mobile navigation.

## Implementation

Use a sticky viewport-height flex sidebar with a scrollable upper region and a non-shrinking footer. Retain the existing footer actions and sign-out behavior. Validate normal and short desktop viewports, main-page scrolling and the mobile menu; this is a reversible layout correction with no persistence or authorization change.

## Verification

2026-11-03: Visually verified the real local application at desktop sizes 1280×420 and 1280×800. In the short window, the upper region had 449 px of content in 265 px of available space and scrolled independently by 184.8 px using the keyboard. Scrolling the main page by 420 px retained sidebar top 0 and footer bottom 420. At normal desktop size, footer bottom was 800. At 390×844, the desktop sidebar was hidden and the mobile menu retained all seven links and Sign out. Shared 64 px desktop horizontal padding is retained.

TypeScript, Prettier, diff checks and the optimized production build pass. No permanent tests were added for this low-impact layout correction. [Desktop evidence](../../../docs/evidence/ticket16/desktop.png), [short-window evidence](../../../docs/evidence/ticket16/desktop-short.png).
