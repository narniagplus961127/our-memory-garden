# 90 — Release reviewed improvements and provide outage recovery screens

Status: resolved

The owner approved all next steps on 2026-11-22, including merging PRs 46 and 47, production verification and friendly outage handling. Release those reviewed commits in order, confirm production source/alias, and verify public/private boundaries and the authenticated editor without altering personal content.

Add shared public/admin/global error screens with the pixel garden theme, useful retry/navigation actions and generic text that never reveals internal exceptions or private page details. Use the installed Next.js retry API. Preserve existing local editor recovery during failed saves; do not turn transient failures into sign-out or clear recovery storage. Verify server outage/retry and client save failures against isolated local services, including mobile. Keep changes reversible and document production checks and limitations.

The owner explicitly declined automatic backups and unattended alerts after the initial scope discussion. Those features are excluded; existing manual export/recovery tools remain available.

## Answer

Merged PR 46 (`ec98f828a12fa4e02ba2572018d60968755006d4`) then retargeted/merged PR 47 (`86492ee811081b1526ba09766c3c969a8d042f1e`). Production deployment `dpl_5tvpX6nup4Qo5HGK1Au5kWF2KoSr` was READY, canonical alias matched, and the authenticated dashboard/navigation page picker rendered real page choices. Verification was read-only; personal production content was preserved.

Added themed public/admin/global boundaries using the installed Next.js `retry` API. Local production-mode tests sever real database connections externally, confirm generic public/admin screens, restore connectivity and click successful retries at desktop and mobile sizes. The pinned managed-auth runtime regression passes. HTML 503 saves now show friendly messages and retain existing page/content metadata recovery. Persistent editor notices can be dismissed while a header retry action remains available.

Production build, type check and formatting pass. Desktop content recovery and desktop/mobile metadata recovery pass. Mobile content recovery is checked separately after adding notification dismissal. Templates retain unsaved edits in memory and warn before leaving; they do not have page-style device recovery. No production outage was induced. Firewall evidence is tracked separately in ticket 92.
