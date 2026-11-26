# 122 — Restore swiper controls, increase hover lift and refine menu button

Status: resolved

Restore the previous swiper arrow buttons and pagination design. Keep the paper frames, next-slide glimpse and card hover improvements. Increase the hover lift from 3px to 6px for cards and public swiper slides. Preserve reduced-motion behavior. Verify and deploy under standing authorization.

Also replace the plain header menu button with a compact wooden tile and crisp cream pixel bars, retaining its existing accessible label, focus behavior and touch target.

## Answer

Restored outline previous/next buttons, their cream surfaces and pixel shadows, hover treatment, square pagination dots and the active dot's shadow. Retained paper slide frames, next-slide glimpse and compact pagination spacing. Increased the card/template/public-slide lift to 6px only for fine pointers with reduced motion off.

The menu trigger now uses the existing wooden-sign artwork with cream pixel bars. It retains its accessible label and 44px target. The shared theme review in ticket 123 extends the wooden treatment to its close button and the mobile dashboard menu.

## Verification

- Compared restored control rules against the pre-polish commit and checked them in the browser: outline variant, square dots and active pixel shadow.
- Local browser checks confirmed a 6px card lift, no lift with reduced motion, 44px wooden menu buttons, and successful menu opening and closing.
- Desktop/mobile navigation, swiper and editor checks passed as part of ticket 123's verification.
- Formatting and production build/type checks pass. No production content or settings changed.
