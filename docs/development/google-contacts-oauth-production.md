# Google Contacts OAuth production readiness

Google Contacts Synchronization uses a server-side OAuth 2.0 authorization-code
flow with offline access and the Contacts write scope. Production must use a
verified Google Cloud OAuth client whose redirect URIs, consent-screen identity,
and privacy/support details match this application. Do not point live Ganatri
Admin at an unverified development OAuth client.

Disconnecting or replacing a Google Contacts Connection invalidates Ganatri's
local usable authorization and stops obsolete outbox work. Those actions never
delete or modify Contacts in the old Google account. A replacement account is a
fresh destination: it starts without previous Customer linkages and needs a new
initial catch-up sync. V1 supports one Google account per Organization.

The worker revalidates the active connection and credential immediately before
every Google Contact create or update, and Google provider requests have a
15-second timeout. A request Google already accepted before lifecycle
invalidation may finish, but no new Contact mutation starts after the worker
observes disconnect or replacement.

## Redirect URIs

The redirect URI in Google Cloud Console must match
`GOOGLE_CONTACTS_OAUTH_REDIRECT_URI` exactly, including scheme, host, port, and
path. The Admin callback route is `/google-contacts/oauth/callback`.

| Environment      | Authorized redirect URI                                   | Backend env value                                                                              |
| ---------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Local Admin      | `http://localhost:5173/google-contacts/oauth/callback`    | `GOOGLE_CONTACTS_OAUTH_REDIRECT_URI="http://localhost:5173/google-contacts/oauth/callback"`    |
| Production Admin | `https://admin.ganatri.in/google-contacts/oauth/callback` | `GOOGLE_CONTACTS_OAUTH_REDIRECT_URI="https://admin.ganatri.in/google-contacts/oauth/callback"` |

Add both URIs to the same OAuth client only if that client is used for both
environments. Prefer a dedicated production client. Never reuse a localhost-only
testing client for `admin.ganatri.in`.

The client secret, OAuth state secret, and credential keyring stay in
`apps/backend/.env`. Do not copy them to `apps/admin/.env` or any browser bundle.

## OAuth consent screen

Configure the Google Cloud OAuth consent screen with production identity before
submitting the app for verification:

- Application name that users will recognize as Ganatri
- User support email that Google can show on the consent screen
- Application logo and homepage URL for `https://ganatri.in` or
  `https://admin.ganatri.in`
- Authorized domain `ganatri.in`
- App type: External, unless a later Google Workspace-only restriction is
  deliberately chosen

The consent screen must request only the scopes this feature uses:

- `https://www.googleapis.com/auth/contacts` — create and update personal Contacts
- `https://www.googleapis.com/auth/userinfo.email` — display the connected account

Do not add Gmail, Drive, Calendar, or other scopes. Replacement uses Google
account selection plus consent so a business can connect a different account
without granting extra access.

## Privacy policy, terms, and support

Google requires public privacy and support details before production users can
complete consent for a verified Contacts app. Publish and link:

- A privacy policy that states Ganatri exports eligible Customer names and phone
  numbers into one connected Google account's personal Contacts, stores
  encrypted refresh credentials, and never imports Google Contacts into Ganatri
- Terms or an equivalent support page describing the Organization-owned
  connection, disconnect, and replacement behavior
- A support email or contact URL that matches the consent-screen support email

The privacy policy must also say that disconnecting or replacing the connection
stops future synchronization and removes Ganatri's usable authorization, and
that Ganatri never deletes Google Contacts.

Until those URLs exist and are entered on the consent screen, keep the OAuth
client in testing and do not roll the feature out to production Organizations.

## Scope verification

`https://www.googleapis.com/auth/contacts` is a sensitive Google OAuth scope.
Production rollout needs Google's OAuth verification for that scope, including:

- A completed OAuth consent screen with the production redirect URI
- The privacy policy and support links above
- A demo video or written explanation of the one-way Customer name/phone export,
  exact phone-number matching, and the guarantee that Ganatri never deletes a
  Google Contact
- Justification for write access: create a Contact when none matches, or update
  the matched name and matching phone entry while preserving other Google data

Do not submit or ship a production client that still shows the unverified-app
warning. Unverified clients are limited to test users and are not production
ready.

## Backend configuration

Production `apps/backend/.env` must include:

```env
GOOGLE_CONTACTS_CLIENT_ID="<production-oauth-client-id>"
GOOGLE_CONTACTS_CLIENT_SECRET="<production-oauth-client-secret>"
GOOGLE_CONTACTS_OAUTH_REDIRECT_URI="https://admin.ganatri.in/google-contacts/oauth/callback"
GOOGLE_CONTACTS_OAUTH_STATE_SECRET="<long-random-state-secret>"
GOOGLE_CONTACTS_CREDENTIAL_KEYS_JSON='{"v1":"<base64-32-byte-key>"}'
GOOGLE_CONTACTS_CREDENTIAL_ACTIVE_KEY_VERSION=v1
GOOGLE_CONTACTS_WORKER_TOKEN="<same token as the Google Contacts worker>"
GOOGLE_CONTACTS_WORKER_ID=google-contacts-worker-0
```

The dedicated Google Contacts worker uses `GOOGLE_CONTACTS_API_URL`,
`GOOGLE_CONTACTS_WORKER_TOKEN`, and `GOOGLE_CONTACTS_WORKER_ID`. Give this
service its own process credentials and do not reuse tokens from another
service.

Production worker `.env` on ganatri.in
(`/var/www/ganatri.in/backend/apps/google-contacts-worker/.env`):

```env
GOOGLE_CONTACTS_API_URL=http://127.0.0.1:8181/api
GOOGLE_CONTACTS_WORKER_TOKEN="<same token as the backend>"
GOOGLE_CONTACTS_WORKER_ID=google-contacts-worker-0
GOOGLE_CONTACTS_WORKER_POLL_INTERVAL_MS=5000
```

Copy `apps/google-contacts-worker/.env.example` to `.env` locally, then point
the production copy at port 8181. PM2 app name is
`ganatri-in-google-contacts-worker`. See
[Ganatri.in deployment guide](./ganatri_in_deployment_guide.md).

After changing redirect URIs or consent-screen details, restart the backend so
it signs new OAuth state against the production callback.
