# System review — 26 November 2026

Baseline: production/main `c94e063f604c38978eb57bbf1af233cdfad7ad8b`, after the refined garden palette release. This is a review, not an implementation release. Production content, credentials, firewall configuration and application code were not changed.

## Assessment

Keep the current Next.js application and pixel-garden direction. A rewrite or another visual theme change is not the next useful investment. The strongest opportunities are distributed abuse protection, template draft recovery, dependable release checks and avoiding unnecessary database work.

No administrator-access bypass was confirmed in the paths examined. This is not a complete penetration test or a certification that every path is secure. The public interface, source, selected local service/runtime tests and a small set of live access checks were reviewed; managed production sign-in, email delivery, all provider settings and every browser journey were not exhaustively tested.

## Priorities

| Order | Priority | Area                            | Finding                                                                                | Evidence level                               |
| ----- | -------- | ------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1     | High     | Security/cost                   | Custom abuse monitoring is not distributed enforcement                                 | Active production firewall inspected         |
| 2     | High     | Data reliability                | Template drafts have no recovery after a failed save and reload                        | Reproduced locally                           |
| 3     | Medium   | Delivery                        | Test expectations and test isolation need repair before adding a reliable release gate | Failing checks reproduced                    |
| 4     | Medium   | Database/cost                   | Metadata and list paths fetch more data than they need; render work is duplicated      | Confirmed source behavior                    |
| 5     | Medium   | Upload performance              | Image processing and storage I/O hold a database transaction open                      | Confirmed source; contention not load-tested |
| 6     | Medium   | Frontend performance            | One large font loads globally; the above-fold hero is lazy-loaded                      | Live resource/DOM measurements               |
| 7     | Medium   | Security hardening              | Top-level HTML has no Content Security Policy                                          | Live response headers inspected              |
| 8     | Medium   | Access administration           | Invitations exist, but there is no administrator roster/revoke interface               | Source/interface review                      |
| 9     | Low      | Responsive design/accessibility | Timer wrapping, hero balance, heading semantics and photo descriptions need polish     | Live measurements/content review             |
| 10    | Low      | Maintainability/operations      | Large mixed-responsibility modules, layered overrides and sparse error diagnostics     | Source review                                |

### 1. Turn the reviewed abuse policy into actual enforcement

The active firewall configuration has `firewallEnabled=true`, but its custom authentication/invitation rule uses the `log` action. It covers POST `/api/auth/*` and POST `/api/invitations`; it has no rate-limit action. This does not mean Vercel's default DDoS protection is disabled.

The application limiter in `src/lib/server/request-rate-limit.ts` is bounded and correctly distrusts arbitrary forwarding headers outside Vercel. However, its counters live in one process. Multiple instances and cold starts do not share a limit. Public page rendering, sitemap and page-grid reads also perform database work without this application limiter. Logging alone does not stop those requests reaching the application.

Next step: review legitimate traffic and stage distributed enforcement, with separate thresholds for authentication and image traffic. Do not put a gallery's many image requests under a low login threshold. Preserve rollback to monitoring mode. This reduces exposure to abusive traffic; it is not a promise of a hard spending cap. No firewall rule was changed by this review. [Vercel firewall actions](https://vercel.com/docs/vercel-firewall/firewall-concepts), [rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

### 2. Give templates the page editor's recovery protection

`src/components/template-editor.tsx:14` stores the draft in component state. It warns before leaving and offers retry after a transient failure, but does not persist an account-scoped device copy. Its conflict path also removes Retry (`:115`) and relies on instructions to open the saved template elsewhere. Templates do not have the page editor's recovery/merge experience.

Reproduction: created a disposable local template, intercepted its PATCH with a simulated 503, changed its name, observed **Not saved**, then reloaded and accepted the leave warning. The editor returned to the original saved name with **Saved** and zero device recovery records for that template. The unsaved edit was lost. The warning is present; the finding is that there is no recovery after an accepted reload, tab loss or crash, rather than that the editor silently ignores a successful save. The disposable template was removed afterward.

Next step: reuse the account/template/session-scoped recovery pattern already used for pages. Retain unsaved work on network failure and provide a concrete compare/reload path for version conflicts. Keep cross-account isolation and sign-out cleanup. A template revision history can follow separately; this does not require automatic site backups.

### 3. Repair the verification gate

The existing desktop navigation regression fails at `tests/browser/navigation-drag.spec.ts:227`: it expects the old `rgb(255,252,245)` drawer, while the current approved palette renders `rgb(229,237,223)`. Later assertions also retain earlier menu text colours. The failure is an outdated test expectation, not evidence that dragging itself is broken.

The combined local blocks/concurrency/media run executed 24 tests: 16 passed and eight failed after the shared sign-in limiter returned 429 where tests expected 200. The interrupted concurrency test and all seven photo tests passed when rerun without that interference. The limiter should remain enabled in production; the test harness needs controlled fixture/session isolation, or a fresh local server per appropriate suite, with separate tests for throttling itself.

`npm run typecheck` passed. Repository-wide `npm run format:check` failed on the existing `src/components/media-filters.tsx` and `tests/browser/media-filters.spec.ts`. No `.github/workflows` test pipeline is checked in. The combined status query for the reviewed production commit returned a successful Vercel deployment status; this review did not establish all externally configured repository checks or branch rules.

Next step: correct stale assertions, make the suite deterministic, then automate formatting, types, security-sensitive service tests and a small desktop/mobile smoke set. Keep secrets out of logs and avoid publishing authentication-state files or unredacted browser traces as CI artifacts. A successful build is not a substitute for these checks.

### 4. Stop fetching complete documents for metadata and legacy lists

`src/app/sitemap.ts:11` selects `pages.*`, including editor content, although its output only needs an address, homepage marker and update timestamp. `src/app/page.tsx:9` and `:13` independently call `getHomepage()`, which selects the complete document. Header and content rendering also call `currentAdministrator()` separately (`src/components/garden-header.tsx:11`, `src/components/garden-content.tsx:41`). These database calls are not wrapped in request-scoped memoization. Slug metadata and page rendering have separate lookups as well.

The paginated admin page list and current media picker are good improvements. Legacy GET `/api/pages` still returns all page documents through `listPages()`, and the media endpoint retains an unpaginated compatibility response when no `view` is supplied. These are administrator-only, but they are still an easy way for a future caller to reintroduce large transfers.

Next step: use narrow metadata projections; deduplicate safe lookups within a render; give legacy list compatibility an explicit migration/version policy and bounded replacement. Do not share administrator decisions between users or cache private/public permission decisions across requests. React's request-scoped `cache` is distinct from a persistent shared cache. [Next.js metadata and request deduplication](https://nextjs.org/docs/app/api-reference/functions/generate-metadata).

No production query-plan benchmark was performed, so exact cost savings are not claimed. A later scaling review should profile the live-photo usage query: `garden_media_usages` still discovers some references by traversing JSON documents. Any reference index must update transactionally so removing the final public use continues to revoke access immediately.

### 5. Shorten photo-completion transactions

`src/lib/server/media.ts:343` opens a transaction and locks the photo before reading the staged original (`:361`), decoding/resizing with Sharp (`:393`), writing original/display objects (`:401`, `:410`) and writing thumbnail variants (`:418`). Slow storage or CPU processing keeps a database connection and transaction occupied throughout. The client queue currently limits itself to two active jobs, which helps, but multiple administrators/instances can process at once.

Next step: claim processing in a short transaction, process under a bounded ownership/lease token outside it, and atomically finalize the ready record. Preserve idempotent retries, deletion exclusion, staging expiry and immutable keys. Do not simply move operations outside the transaction without these guarantees. This is an architectural performance risk confirmed in source; an actual production pool-exhaustion incident was not reproduced.

### 6. Reduce first-visit page weight and prioritize the hero

A live desktop first-load sample downloaded approximately **695 KB for the pixel font**, versus approximately **116 KB for the hero thumbnail**. The single globally loaded font is configured at `src/app/layout.tsx:9`. Preserve Chinese/English support and the visual style, but consider Latin/CJK subsets with `unicode-range` so an English-only screen does not require every glyph. Existing static browser caching and `font-display: swap` are useful and should stay. [Web font subsetting/loading](https://web.dev/articles/optimize-webfont-loading).

The actual homepage hero had `loading="lazy"`, matching the shared Image renderer at `src/components/garden-blocks.tsx:987`. Below-fold photos should remain lazy. The first visible hero should have an explicit eager/high-priority path, without prioritizing every image block. Measure LCP before and after; a single unthrottled browser sample is not a field-performance score. [LCP image guidance](https://web.dev/articles/optimize-lcp).

Font reductions mainly improve initial page weight and visitor/CDN transfer. They should not be presented as eliminating Vercel image-origin transfer. Public and private optimized photos still pass through the application because current visibility is checked on each request. Avoid weakening that privacy boundary just to obtain a higher CDN hit rate.

### 7. Add top-level CSP carefully

The live HTML response has HSTS, `nosniff`, `X-Frame-Options: DENY` and the expected referrer policy. It has neither an enforced nor report-only CSP. `next.config.ts:79` confirms the current application header set. The custom HTML block already has its own restrictive CSP and an opaque-origin `sandbox="allow-scripts"`; that is a separate, useful boundary.

Next step: introduce a top-level **report-only** CSP compatible with Next.js scripts, editor preview styles and required storage/media behavior, inspect violations, then enforce a tested policy. A Permissions Policy can also deny unused browser capabilities after checking Custom Embed requirements. Absence of CSP is defense-in-depth work; the review did not demonstrate a stored-XSS exploit, and the rich-text injection checks passed. [OWASP CSP guidance](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).

### 8. Make administrator access reviewable and revocable

The Account screen (`src/app/admin/settings/account/page.tsx:18`) exposes invitation creation, but there is no administrator roster or revoke/cancel interface. Current access is checked against `garden_administrators` on server requests, which is a good foundation for revocation. With unlimited administrators, an operator should be able to see who has access and cancel unused invitations without directly editing SQL.

Next step: add a roster, pending-invitation cancellation and confirmed access revocation, protecting the final administrator from accidental removal. Keep the existing equal-access model unless a role system is separately requested. Review provider MFA support later; this review did not verify the production account's MFA configuration.

### 9. Polish the current layout rather than redesigning it

- **Timer:** measured six unit rows at 320px, five at 390px, and two at tablet/desktop widths. A compact mobile layout with two units per row would reduce the long vertical stack. Keep the wooden signs and readable labels; avoid shrinking the font until it is difficult to read. Relevant styles: `src/app/globals.css:2926` and `src/app/pixel-theme.css:535`.
- **Desktop hero:** the full-width photo dominates the initial desktop viewport, pushing the introduction below it. Consider an optional hero-height/focal-point setting. This is an editorial choice, not a rendering bug, and should not crop every existing image automatically.
- **Heading semantics:** the live introduction goes from an H1 to a styled H3 tagline. A paragraph styled as a subtitle would preserve the appearance with a clearer document outline. An editor outline warning could help authors avoid skipped heading levels.
- **Photo descriptions:** several live items use generic “Photo 1”, “Photo 2” and similar alternatives. Existing alt/caption fields can hold short meaningful descriptions without adding visible prose to the page. Improve content where useful; do not pretend filenames or invented AI descriptions reliably describe personal photos.

No horizontal document overflow was observed in the checked homepage layouts at 320/390px. Menu keyboard focus stayed within the open dialog, Escape returned focus to the menu trigger, and the mobile photo viewer fit 320 × 844px with readable shared colours. Animations were allowed to settle before assessing contrast; intermediate fade-in frames are not a colour defect.

### 10. Improve module boundaries and diagnosis

`page-editor.tsx` has 1,469 lines, `garden-blocks.tsx` 1,482, `media-library.tsx` 918, with 3,193 lines of global CSS and 1,261 lines of editor CSS. Size alone is not a bug. The practical issue is that block schemas, inspector controls, rendering, navigation and editor state require changes in large shared files, while global and pixel styles repeatedly override each other.

Next step: extract coherent features, such as template recovery, image selection and block inspector controls, while keeping the public interfaces small. Separate rendering concerns from editor-only field definitions where that simplifies ownership. No measured claim is made that the entire editor is currently shipped to public visitors.

Unexpected request failures log only the error name in `src/lib/server/http.ts:64`. This avoids leaking secrets, but repeated `Error` entries give little help diagnosing provider or database failures. Add a correlation ID, operation and allowlisted error code; keep credentials, cookies, invitation tokens, personal content and signed URLs out of logs. This can use the existing logs and manual workflow; it does not require a new monitoring service or unattended alerts.

## What is already working well

- Server-only database access and parameterized SQL; authenticated administrator membership is checked at protected route boundaries.
- Strict-origin mutation checks, bounded streamed JSON, validation of nested blocks and allowlisted rich text/link formatting.
- Photo upload size/pixel/type checks, protected originals, metadata-stripped display variants and server-computed duplicate fingerprints.
- Photo permission checks before ETag/304 or cached-byte reuse. The photo tests confirmed anonymous access disappears after the final public use is removed.
- Page concurrency handling, exact revision archives, account-scoped device recovery and stable block IDs; selected race/retry tests passed.
- Paginated lists/pickers, smaller responsive image variants, bounded byte caching, explicit unavailable/retry states and a persistent upload queue.
- Shared palette, readable dark text, light supporting controls, pixel/wood consistency and functional mobile menu/viewer focus behavior.
- Current production dependency audit returned zero known vulnerabilities. That registry result does not cover application logic or unknown vulnerabilities.

## Verification record

| Check                                                       | Result                                                                                                    |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Production dependency audit, `npm audit --omit=dev`         | 0 reported vulnerabilities                                                                                |
| Type checking                                               | Passed                                                                                                    |
| Repository formatting                                       | Failed on the two existing files named above                                                              |
| Runtime request-limit, maintenance-auth and cache tests     | 9 passed                                                                                                  |
| Local privacy/visibility tests                              | 5 passed                                                                                                  |
| Local nested-block validation and concurrency tests         | 17 unique checks passed; one required isolated rerun after test throttling                                |
| Local photo access/validation/pagination tests              | 7 passed in isolation                                                                                     |
| Combined blocks/concurrency/media execution                 | Initially 16 passed / 8 failed due to shared login 429s; all eight interrupted checks passed in isolation |
| Existing desktop navigation regression                      | Failed on stale drawer-colour assertion at line 227                                                       |
| Template failed-save/reload scenario                        | Unsaved name lost after warning accepted; no template device recovery record                              |
| Anonymous production pages/media/categories APIs            | 401 with private/no-store                                                                                 |
| Anonymous production maintenance endpoint                   | 401 with private/no-store                                                                                 |
| GET collection `/api/templates`                             | 405, unsupported method; not a data disclosure                                                            |
| Cross-origin production page-create request with empty body | 403 before a mutation                                                                                     |
| Live menu focus/Escape and mobile photo viewer              | Passed checked interactions                                                                               |

There were **38 unique passing selected runtime/service checks**, plus the deliberately reproduced navigation-test and template-recovery findings. This was not a full green run of every repository test. Local test accounts, photos, simulated failures and disposable content stayed in the isolated fixture. Review screenshots, test traces and temporary session state were not committed. The earlier refined-theme release already passed its production build; this review ran type/format gates rather than claiming another full build.

## Suggested delivery order

1. Address distributed abuse enforcement and template draft recovery.
2. Repair test isolation/expectations and establish automated release checks.
3. Narrow metadata/list queries and deduplicate render lookups; then optimize the font and hero loading.
4. Add CSP and access-management controls; shorten processing transactions with explicit retry guarantees.
5. Apply the compact timer/editor organization polish after those changes.

Manual recovery/export procedures should remain documented. The owner previously declined automatic backups and unattended alerts; this review does not propose re-enabling those features or adding a paid service. No data should be pruned, permissions changed or public image caching relaxed as a side effect of these improvements.
