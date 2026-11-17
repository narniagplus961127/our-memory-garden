# 73 — Private administrator invitations

Status: resolved

- Allow an administrator to create an invitation from Account settings for a fixed recipient name and email. A new link for the same email replaces the earlier link.
- Use Neon Auth email signup and a verification code. Only a verified invitation account can become an administrator. Grant access and consume the invitation in the same transaction, within the existing two-account limit.
- Expire the single-use link after 24 hours. Save a hash of the token and pass the raw token in the URL fragment. Bind verification to the browser that sets or authenticates the password.
- The owner shares the invitation privately. The managed provider sends the verification code.
- Run the invitation browser test against an isolated local database named with the `garden_invitation_test` prefix, seeded with one administrator. The local auth adapter writes verification codes to the test outbox.
