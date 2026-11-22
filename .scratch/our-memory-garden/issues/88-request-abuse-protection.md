# 88 — Bound requests and protect authentication before database access

Status: resolved

The owner approved the high-priority system-review findings on 2026-11-22. Apply byte limits while streaming request bodies, including small authentication and invitation requests. Add bounded per-instance throttling before authentication database/provider calls, with explicit Retry-After and no sensitive identifiers in logs. Treat it as defense in depth, not distributed DDoS protection or a billing cap.

Inspect the existing Vercel firewall, prepare narrowly scoped authentication/invitation and media-read rate-limit rules in log mode, and preserve default platform protection. Do not publish blocking rules without reviewing matching legitimate traffic. Document counters, rollout and rollback, including plan limitations. Keep login, recovery, invitation acceptance and large authenticated editor imports functional.

Verify chunked/Unicode bodies, absent/false Content-Length, per-client isolation, throttling before database access, expiry, local and managed authentication, and private-photo denial. No production credential changes or invitation sends are required.

## Resolution — 2026-11-22

Shared JSON reading is bounded while streaming, cancels oversized requests, and preserves the default million-character editor allowance including Chinese. Authentication bodies have an 8 KB cap; invitation acceptance retains its 2 KB cap. Auth forwarding reconstructs consumed JSON safely, drops stale Content-Length, and forces the canonical password-reset return URL.

Added per-client/per-action fixed-window throttling before authentication/invitation work and photo delivery. Counters are bounded to 4,096 entries, expire, and cannot be bypassed by evicting active keys. Only Vercel's platform client-address header is trusted on Vercel; elsewhere forwarding headers do not create arbitrary client buckets. No counter writes touch Neon. 429 responses include Retry-After and private/no-store. Per-minute defaults: recovery 10, ordinary auth actions 30, get-session 300, invitation acceptance 30, media reads 1,200.

Vercel initially had no custom firewall configuration. Added one log-only POST auth/invitation monitoring rule. The REST API activated that non-blocking rule immediately (rather than producing a CLI draft); a read of active configuration confirmed the exact valid conditions, log action and enabled firewall. ID: rule_garden_authentication_abuse_monitoring_KKeOFi. No blocking action, paid upgrade or default DDoS disablement was applied. Distributed WAF enforcement remains a manual rollout after legitimate-traffic review and a preview rehearsal; the concrete configuration and Hobby one-rate-rule limitation are documented in docs/request-protection.md. Process-local counters are not distributed protection or billing caps.

Verification: six unit boundary tests, nine isolated local media/privacy service tests, type checking, changed-file formatting, diff checks and the complete production webpack build passed. The production-mode managed SDK regression passed with local fixtures: actual signed cached sessions, upstream revocation, no managed-auth request for public conditional media, revocation checks for private conditional media, canonical reset redirects, 413 responses before provider work and 429 with Retry-After after 30 reset attempts. No real recovery email or invitation was sent. Default sandbox network restrictions required local test services to run with approved host access.

Known baseline check limitation: repository-wide format:check flags src/components/media-filters.tsx and tests/browser/media-filters.spec.ts. Both are unchanged from origin/main; all files changed by these tickets pass targeted formatting. Unrelated formatting was preserved.
