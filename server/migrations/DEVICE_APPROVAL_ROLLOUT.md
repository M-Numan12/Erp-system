# Device approval rollout (staging first)

This branch changes login/session security. **Do not deploy directly to production** before testing the whole flow and verifying backups.

## Prerequisites
- Back up the production PostgreSQL database and confirm restore procedure.
- Set FRONTEND_URL to the actual frontend origin so review emails link to the admin portal.
- Confirm RESEND_API_KEY and EMAIL_USER work.
- Run 20261018_device_identity.sql on a staging copy of the DB before deploying the matching backend.
- Keep a verified admin account available. Admin portal accounts can bootstrap a device.
- Consider disabling the old `/api/auth/register` public registration if not explicitly required.

## Expected behavior
1. User signs in with valid credentials on an unrecognized browser; device remains pending and admin receives approval request email.
2. Admin signs in to Admin Portal, opens Users Manager, finds the user and approves the specific device.
3. User sees approval and logs in once more with password (no unauthenticated token issuance).
4. Repeated login from the same browser works without repeated approval, including on changed IPs.
5. Admin removes that device via Users Manager: the bound JWT fails on the next protected API call and the active browser polls `/auth/me` within ~15 seconds.
6. New browser/cleared local storage requires a new approval.

## Compatibility warnings
- Existing sessions without `deviceRecordId` will be signed out after backend rollout.
- Existing approved devices with NULL `device_key_hash` need one-time reapproval.
- Old email approval GET links remain disabled. Admin must use the authenticated dashboard.
- Migration adds columns/index only; rollback of application code is safer than deleting device metadata.
- Vercel builds do **not** verify the external Render backend, Postgres schema or email service.

## Do not merge until
- Login is tested with Admin, Wholesale and all Retail roles.
- Approve/forget-device behavior tested from separate machines.
- Admin panel works when session is revoked.
- Database migration run successfully on staging and restore plan is confirmed.
