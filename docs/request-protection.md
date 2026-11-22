# Request abuse protection

## Application safeguards

Authentication bodies are limited to 8 KB before database/provider access. Invitation acceptance keeps its 2 KB limit. Shared JSON parsing now counts bytes while reading and cancels oversized streams, including chunked requests and false Content-Length values. Existing explicit import limits remain unchanged. The default editor allowance still accepts one million characters (including Chinese), with a three-million-byte streaming ceiling.

Warm application instances apply fixed one-minute counters before protected route work:

| Requests | Maximum per client per instance per minute |
| --- | ---: |
| Password recovery | 10 |
| Other allowed authentication actions | 30 per action |
| Session endpoint | 300 |
| Invitation acceptance, all stages combined | 30 |
| Photo display/thumbnail/original reads, combined | 1,200 |

Rejections return 429 with a Retry-After value and private/no-store. Cross-origin mutations remain denied. Photo throttling returns before authorization, storage fetches and usage-sample writes. Oversized bodies return 413; invalid JSON returns 400. Authentication counters are checked before reading bodies or querying administrator membership.

Only Vercel's platform-provided x-vercel-forwarded-for address is trusted when VERCEL=1. Other deployments share a conservative fallback bucket; caller-supplied forwarding headers, cookies and user agents cannot reset it. Client keys are hashed, kept only in process memory and not logged. At most 4,096 active counters are retained; new identifiers cannot evict active limits. Each scope resets after its window.

These are defense-in-depth limits, not a distributed limiter or spending cap. Cold starts and multiple instances have independent counters. A distributed attack can still generate chargeable traffic. Default platform DDoS protection remains enabled. Deployments behind another proxy need separate trusted-client configuration before changing the address policy.

## Vercel rollout

On 2026-11-22 the existing project had no custom firewall rules. A single monitoring-only rule was added for POST /api/auth/* and POST /api/invitations. The REST API applied this log-only rule immediately; reading the active configuration confirmed it is valid, firewallEnabled=true, with no blocking action. The rule ID is `rule_garden_authentication_abuse_monitoring_KKeOFi`. No blocking rule or paid plan upgrade was activated.

Review matching requests in the project's **Firewall → Traffic** before enabling distributed enforcement. Logs must include real sign-in, recovery and invitation traffic, not only failed requests. Use the existing rule rather than consuming a second rate-limit allowance; the documented Hobby allowance is one rate-limit rule per project. Do not group media reads under a low authentication threshold.

The concrete next configuration is the existing POST auth/invitation conditions with a fixed 60-second window, IP counting, and a generous initial 120-request threshold. Start with rate-limit action Log. Inspect the resulting rule and diff, review production matches, and rehearse blocking in a preview before selecting Too Many Requests (429) and publishing enforcement. Previews are currently disabled for this project: arrange an isolated approved preview rehearsal rather than enabling production blocking without it. Roll back enforcement to Log if legitimate users are affected. Leave platform DDoS mitigations enabled.

The application release and the firewall enforcement step are separate. The repository adds active per-instance limits; log-only WAF monitoring does not itself block abuse or stop billing. Provider usage alerts are still needed.

References: [Vercel client headers](https://vercel.com/docs/headers/request-headers), [WAF rate limiting and plan allowances](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
