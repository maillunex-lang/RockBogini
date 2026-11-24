# Hero Studio: administrator access

The studio API uses existing account sessions but **never** grants admin rights from registration, guest login, or email domain.
Each privileged request checks an active session, a linked email account, and membership in the `studio_admins` table.
Unauthenticated requests receive 401; non-admin authenticated requests receive 403. Rate limit: 120 requests per 60 seconds per admin account.

A server operator must explicitly grant an existing, email-linked account by verifying its email and account ID, then inserting its ID into `studio_admins`. No account is auto-promoted and no bootstrap admin password is published. Example procedure on the server (replace placeholders, do not paste private credentials in a chat):

```sql
SELECT id,email FROM accounts WHERE email='OWNER_EMAIL' AND password_hash IS NOT NULL;
INSERT INTO studio_admins(account_id) VALUES ('VERIFIED_UUID') ON CONFLICT DO NOTHING;
```

Revoke: `DELETE FROM studio_admins WHERE account_id='VERIFIED_UUID';`
The UI uses the account session already saved in the local browser for the Next test client; use the same browser origin. Do not place bearer tokens in URLs or code.

GET `/v1/studio/me`: admin check.
GET `/v1/studio/drafts/:model/:kind/:slot`: latest and up to 100 versions.
PUT on that path: `{expectedRevision,payload}`; optimistic conflict returns 409.
POST `.../restore`: `{expectedRevision,restoreRevision}`; creates a new revision.
Drafts never modify the original game. Before production use, add audited admin provisioning, explicit version publishing, secure dedicated admin sign-in and browser-driven validation.
