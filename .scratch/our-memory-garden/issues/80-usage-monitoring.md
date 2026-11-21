# 80 — Usage monitoring and in-app warnings

Status: resolved

Add an authenticated Usage & alerts screen. Record privacy-preserving hourly aggregate samples of photo/backup origin responses, with a 1-in-20 production sample rate to limit monitoring overhead. Estimate transfer and requests from sample weights; show sample counts and distinguish these estimates from Vercel Fast Origin Transfer and provider billing. Include configurable daily/monthly transfer warning levels, elevated-error warnings, a daily trend, and an administrator warning banner. Keep records for 90 days. Do not log photo IDs, URLs, visitor identities, IP addresses or cookies. Never block a photo response if recording fails.

Use existing provider usage notifications and dashboard links for authoritative usage; paid Vercel anomaly monitoring is outside this ticket. No email integration or background polling is implied. Warnings appear while signed-in administrators use the app.

## Verification

Added Settings → Usage & alerts with UTC daily/monthly summaries, seven-day history, traffic type breakdown and editable daily/monthly byte, current-hour request and 5xx warning levels. The ordinary admin shell links to active warnings. Production samples 1 in 20 origin photo/backup responses after delivery; no identifying request data is retained. Summaries show sample counts and explain uncertainty and omissions. Migrations 0023/0024 add aggregate/settings tables and listing indexes. Old hourly aggregates are pruned during usage reviews and opportunistically on collection.

API checks passed for administrator access, same-origin mutation checks, invalid settings, version conflicts, minimum sample thresholds, hourly request warnings and actual post-response recording. Desktop/mobile browser checks passed for saving/reloading settings, visible warnings, admin warning links and horizontal overflow. Screenshots were reviewed and card typography compacted; the explanation is collapsible on mobile and desktop. Typecheck and production build passed. Provider links/documentation distinguish in-app estimates from billed usage. No paid provider add-on, email integration or automated spending cap was enabled.

## Limitations

This observes photo/backup responses that reach the application, not all Vercel/Neon activity or CDN cache hits. Declared sizes can overcount interrupted downloads and sampling can vary at low volume. Tracking starts at deployment. Warnings appear while administrators use normal admin screens; they are not unattended notifications. Native provider notifications remain the authoritative usage-limit channel. See [monitoring behavior](../../../docs/usage-monitoring.md).
