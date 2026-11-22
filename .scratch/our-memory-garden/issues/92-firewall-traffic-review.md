# 92 — Review firewall evidence before enabling blocking

Status: needs-info

The owner approved reviewing traffic and then enabling appropriately verified protection on 2026-11-22. The existing application already has per-instance auth/invitation/media throttling from PR 46. The Vercel custom rule remains log-only for POST /api/auth/* and POST /api/invitations.

Reviewed the authenticated Vercel Firewall Traffic dashboard for the exact rule, Past Day, on 2026-11-22 at about 22:43 Asia/Kuala_Lumpur. It reports No Data for matching requests, paths, clients and actions. The CLI traffic command also requires a separate login; the browser dashboard supplied the actual evidence without collecting credentials. No blocking rule, preview environment, paid service or provider protection was changed.

There is not yet representative traffic to confirm legitimate peaks. Keep current monitoring and application limits. After actual sign-in/recovery/invitation traffic is visible, review it, rehearse the exact rule in an isolated approved preview, then publish distributed enforcement. The concrete initial settings remain IP-based fixed 60-second/120-request auth+invitation windows, with Log before 429 and rollback to Log. Do not apply that low threshold to photo grids. See docs/request-protection.md. This external evidence gap does not block the outage/cleanup release.
