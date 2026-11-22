# 91 — Schedule bounded cleanup of expired temporary data

Status: resolved

The owner approved scheduled cleanup on 2026-11-22. Reuse validated cleanup behaviour for expired exports and old pending uploads. Add a secret-protected daily production cron with fail-closed authorization, overlap protection, bounded work/deadline, safe retry and counts in runtime logs. Never delete ready photo originals/displays, fresh pending uploads, current pages, history or non-expired exports. Keep CLI dry-run compatibility and explicit operator commands.

Verify unauthorized requests, shared cleanup safeguards, expired versus fresh records, storage failure retry, concurrency and unchanged ready bytes with local PostgreSQL/S3 fixtures before enabling production. Configure CRON_SECRET privately and verify a production dry run. No automated backups or unattended alerts: the owner declined both. Daily cleanup is maintenance, not a billing cap.

## Answer

Shared bounded cleanup now powers both dry-run CLIs and a daily secret-protected Vercel cron (19:00 UTC / 03:00 Kuala Lumpur). Production-only sensitive CRON_SECRET is configured privately. The transaction advisory lock works with transaction pooling; 200-second deadline, 10 exports/50 parts each and 100 old pending uploads bound work. Expired export part rows retire only with successful object deletion, allowing larger jobs to progress across runs. Expired pending partial originals/displays/variants are removed; ready photos and current content are untouched.

Real local PostgreSQL/S3/HTTP checks cover authorization, nonmutating HEAD, dry-run, a 55-part export, active export/fresh upload/ready photo preservation, storage failure retry, unsafe keys, overlap and elapsed deadline. Existing staging CLI and export cancellation/expiry maintenance tests pass. No schema migration or new paid service is required. Production dry-run verification is recorded in the delivery follow-up. Repeated failures/backlogs require manual log review; cron delivery is not guaranteed and this is not a billing cap. Automatic backup creation and unattended alerts remain excluded.
