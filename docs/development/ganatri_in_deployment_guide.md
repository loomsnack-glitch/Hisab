# Ganatri.in Deployment Guide

Deploy **ganatri.in** on the Ubuntu VPS at `216.158.228.89`. This is the live
Ganatri stack. WhatsApp is operated through the backend's Meta Cloud API
integration and has no additional runtime process or port.

The previous host is retired. Do not rsync new builds into
`/var/www/ganatri.loomsnack.com`.

| Piece | Stack | Server path | Port |
|-------|-------|-------------|------|
| Admin web | Vite static (`apps/admin`) | `/var/www/ganatri.in/admin/` | — |
| POS web | Vite static (`apps/pos`) | `/var/www/ganatri.in/pos/` | — |
| Console web | Vite static (`apps/console`) | `/var/www/ganatri.in/console/` | — |
| Backend | Bun + Hono (PM2 `ganatri-in-backend`) | `/var/www/ganatri.in/backend/` | **8181** |
| Canonical API | nginx | `https://ganatri.in/api` → `127.0.0.1:8181` | — |
| WhatsApp | Meta Cloud API through the backend | — | — |
| Google Contacts worker | Bun (PM2 `ganatri-in-google-contacts-worker`) | `/var/www/ganatri.in/backend/apps/google-contacts-worker/` | — |

**Ports on this VPS:** `boxmap-backend` uses **8000**. ganatri.in uses
**8181**. WhatsApp uses the Backend service and has no separate port.

**Same database / Redis / MinIO.** Do not create a second Postgres database.

Web apps keep `BASE_API_URL=/api`. Each subdomain proxies `/api` to port 8181,
so cookies stay host-isolated (Admin cookies on `admin.ganatri.in`, POS on
`pos.ganatri.in`, Console on `console.ganatri.in`). The apex `ganatri.in/api`
is the canonical URL for mobile and scripts.

---



## 0. Passwordless SSH (`ssh loomsnack`)

Do this once on your Windows machine so every later `ssh` / `rsync` / `scp`
skips the root password.

### Generate a PEM key (PowerShell)

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ssh" | Out-Null
ssh-keygen -t rsa -b 4096 -m PEM -f "$env:USERPROFILE\.ssh\loomsnack.pem" -N "" -C "loomsnack-vps"
```

That creates:

- private key: `C:\Users\smarty\.ssh\loomsnack.pem`
- public key: `C:\Users\smarty\.ssh\loomsnack.pem.pub`

Never commit these files. Never share the `.pem`.

### SSH config so `ssh loomsnack` works

Create or edit `C:\Users\smarty\.ssh\config`:

```
Host loomsnack
    HostName 216.158.228.89
    User root
    IdentityFile ~/.ssh/loomsnack.pem
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

On Windows, `~` in this file is your user profile. If OpenSSH does not expand
it, use the full path:

```
IdentityFile C:\Users\smarty\.ssh\loomsnack.pem
```



### Install the public key on the VPS (password required once)

```powershell
Get-Content "$env:USERPROFILE\.ssh\loomsnack.pem.pub" | ssh root@216.158.228.89 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

Enter the root password for that one command. After it succeeds:

```powershell
ssh loomsnack
```

should log in with no password. From then on use `loomsnack:` in rsync/scp
instead of `root@216.158.228.89`.

### Same alias inside WSL

Windows OpenSSH and WSL Ubuntu do **not** share `~/.ssh`. rsync from
`ubuntu@DESKTOP-T5H2BCT` needs its own copy. From WSL:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cp /mnt/c/Users/smarty/.ssh/loomsnack.pem ~/.ssh/loomsnack.pem
cp /mnt/c/Users/smarty/.ssh/loomsnack.pem.pub ~/.ssh/loomsnack.pem.pub
chmod 600 ~/.ssh/loomsnack.pem
chmod 644 ~/.ssh/loomsnack.pem.pub

cat > ~/.ssh/config << 'EOF'
Host loomsnack
    HostName 216.158.228.89
    User root
    IdentityFile ~/.ssh/loomsnack.pem
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
EOF
chmod 600 ~/.ssh/config
```

Do not point `IdentityFile` at `/mnt/c/Users/smarty/.ssh/loomsnack.pem`.
NTFS permissions on that path are too open and ssh will refuse the key.

Then from WSL:

```bash
ssh loomsnack
```

If login still asks for a password:

```powershell
ssh -v loomsnack
```

Confirm it offers `loomsnack.pem`. On the server, `grep loomsnack-vps ~/.ssh/authorized_keys` must show the public key.

---



## 1. DNS records (add these first)

At the registrar (or DNS host) for **ganatri.in**, point every host at the
same VPS. TTL 300 seconds is fine while you are going live.


| Type | Host / Name             | Value            | TTL |
| ---- | ----------------------- | ---------------- | --- |
| A    | `@` (apex / ganatri.in) | `216.158.228.89` | 300 |
| A    | `www`                   | `216.158.228.89` | 300 |
| A    | `admin`                 | `216.158.228.89` | 300 |
| A    | `pos`                   | `216.158.228.89` | 300 |
| A    | `console`               | `216.158.228.89` | 300 |


Do **not** change any `loomsnack.com` records. `ganatri.loomsnack.com` stays as
it is.

**Cloudflare:** set these records to **DNS only** (grey cloud), not proxied.
Orange-cloud proxy breaks HTTP-01 certbot unless you already have a different
certificate workflow.

Wait until they resolve before certbot:

```powershell
nslookup ganatri.in
nslookup admin.ganatri.in
nslookup pos.ganatri.in
nslookup console.ganatri.in
```

Each should return `216.158.228.89`.

---



## 2. One-time server directories

```bash
ssh loomsnack

mkdir -p /var/www/ganatri.in/admin
mkdir -p /var/www/ganatri.in/pos
mkdir -p /var/www/ganatri.in/console
mkdir -p /var/www/ganatri.in/backend
```

Bun, Node 20, PM2, PostgreSQL, Redis, nginx, and certbot are already on this
VPS from the current Ganatri deploy. Do not reinstall them.

Also create the Google Contacts worker directory once:

```bash
mkdir -p /var/www/ganatri.in/backend/apps/google-contacts-worker
```

Confirm ports:

```bash
ss -tlnp | grep -E '8001|8181'
```

After cutover, `8181` should be listening and `8001` should be empty.

---



## 3. nginx + SSL

Copy the HTTP-only site files from this repo (certbot will add TLS):

```bash
scp docs/development/ganatri.in loomsnack:/etc/nginx/sites-available/ganatri.in
scp docs/development/admin.ganatri.in loomsnack:/etc/nginx/sites-available/admin.ganatri.in
scp docs/development/pos.ganatri.in loomsnack:/etc/nginx/sites-available/pos.ganatri.in
scp docs/development/console.ganatri.in loomsnack:/etc/nginx/sites-available/console.ganatri.in
```

On the server:

```bash
ssh loomsnack

ln -s /etc/nginx/sites-available/ganatri.in /etc/nginx/sites-enabled/ganatri.in
ln -s /etc/nginx/sites-available/admin.ganatri.in /etc/nginx/sites-enabled/admin.ganatri.in
ln -s /etc/nginx/sites-available/pos.ganatri.in /etc/nginx/sites-enabled/pos.ganatri.in
ln -s /etc/nginx/sites-available/console.ganatri.in /etc/nginx/sites-enabled/console.ganatri.in

nginx -t
systemctl reload nginx
```

After cutover, disable the old site (see [Stop ganatri.loomsnack.com](#stop-ganatriloomsnackcom)). Do not overwrite the live ganatri.in nginx files with the HTTP-only copies in this repo — that drops TLS. Change only `proxy_pass` ports in the live files, or re-run certbot after a full HTTP copy.

Issue **one** certificate covering every new name. DNS A records must already
point here, and port 80 must be reachable:

```bash
certbot --nginx \
  -d ganatri.in \
  -d www.ganatri.in \
  -d admin.ganatri.in \
  -d pos.ganatri.in \
  -d console.ganatri.in

nginx -t && systemctl reload nginx
```

Certbot rewrites the four site files to listen on 443 and redirect HTTP to
HTTPS. The live files on the server will then differ from the HTTP-only copies
in this repo. That is expected. Re-copying the repo files later would drop
TLS; only re-copy if you are repeating first-time setup.

After certbot, `https://ganatri.in/api` still proxies to `127.0.0.1:8181`, and
`/` on the apex still redirects to `https://admin.ganatri.in`.

---



## 4. Backend `.env` on the new stack

Do not commit production secrets. Copy the **already-live** env from the old
path, then change only the port:

```bash
ssh loomsnack

# After the first backend rsync (section 7), or create the file first:
mkdir -p /var/www/ganatri.in/backend/apps/backend
cp /var/www/ganatri.loomsnack.com/backend/apps/backend/.env \
  /var/www/ganatri.in/backend/apps/backend/.env

nano /var/www/ganatri.in/backend/apps/backend/.env
```

Set:

```env
BASE_PATH="/api"
PORT=8181
```

Leave `DATABASE_URL`, Redis, MinIO, `JWT_SECRET`, `OWNER_JWT_SECRET`, email,
and the WhatsApp Cloud API settings exactly as they are on the live backend.
WhatsApp delivery runs inside the Backend service; no additional WhatsApp
environment file or service is required.

Locally, keep `apps/backend/.env` on `PORT=8001` for development. For each
ganatri.in backend upload, either:

- rsync `out/` and then restore `PORT=8181` on the server file, or
- copy the live `.env` into `out/apps/backend/.env`, set `PORT=8181` there,
then rsync.

PM2 also forces `PORT=8181` in `ecosystem.config.ganatri-in.js`.

### WhatsApp Cloud API

Configure the backend-only Meta credentials, webhook secrets, credential
keyring, and public invoice-link settings described in the [Cloud API setup and
test guide](./whatsapp-cloud-api-setup-and-test-guide.md). Keep access tokens
and secrets only in the Backend environment. WhatsApp delivery, retries,
webhooks, and reconciliation run inside the Backend service.

### Google Contacts OAuth

Production Google Contacts Synchronization needs a verified OAuth client, the
Admin redirect URI `https://admin.ganatri.in/google-contacts/oauth/callback`,
consent-screen identity, privacy/support URLs, and Contacts scope verification.
Set `GOOGLE_CONTACTS_OAUTH_REDIRECT_URI` to that production callback and keep
the client secret, state secret, and credential keyring in backend `.env` only.
See [Google Contacts OAuth production readiness](./google-contacts-oauth-production.md).

Backend `.env` must also include a worker token that matches the Google Contacts
worker. Use a unique token for this service and do not reuse a token from
another service:

```env
GOOGLE_CONTACTS_WORKER_TOKEN=<same token as the Google Contacts worker>
GOOGLE_CONTACTS_WORKER_ID=google-contacts-worker-0
```



### Google Contacts worker `.env`

Connecting Google and clicking **Run initial sync** only enqueue outbox rows.
`ganatri-in-google-contacts-worker` must be running or contacts stay `pending`.
This worker has no HTTP port. It polls
`http://127.0.0.1:8181/api/internal/google-contacts/outbox/process-next`.

`turbo prune --scope=backend` includes `apps/google-contacts-worker` because
backend depends on that workspace package. It rsyncs with `out/`. Bun runs
`src/index.ts` directly; there is no separate WhatsApp service or Node build.

Create the local file from the example (gitignored):

```bash
cp apps/google-contacts-worker/.env.example apps/google-contacts-worker/.env
```

Local values stay on port **8001**. Copy that file into `out/` after prune, then
change the API URL to **8181** before rsync, or edit it on the server after
upload. Production `/var/www/ganatri.in/backend/apps/google-contacts-worker/.env`
must be:

```env
GOOGLE_CONTACTS_API_URL=http://127.0.0.1:8181/api
GOOGLE_CONTACTS_WORKER_TOKEN=<same token as the ganatri.in backend .env>
GOOGLE_CONTACTS_WORKER_ID=google-contacts-worker-0
GOOGLE_CONTACTS_WORKER_POLL_INTERVAL_MS=5000
```

---



## 5. PM2 (first time only)

```bash
scp docs/development/ecosystem.config.ganatri-in.js \
  loomsnack:/var/www/ganatri.in/backend/ecosystem.config.ganatri-in.cjs
```

On the server, after backend files exist:

```bash
cd /var/www/ganatri.in/backend/apps/backend
bun install --ignore-scripts

cd /var/www/ganatri.in/backend
cp ecosystem.config.ganatri-in.cjs ecosystem.config.cjs
pm2 start ecosystem.config.cjs
pm2 save
```

`apps/google-contacts-worker` and its `.env` must exist before this first
`pm2 start`, or `ganatri-in-google-contacts-worker` will fail to boot.

`pm2 list` must show **`ganatri-in-backend`** and
**`ganatri-in-google-contacts-worker`**, plus whatever else already runs
(boxmap, etc.). The Google Contacts worker runs
`bun --env-file=.env src/index.ts` from `apps/google-contacts-worker`.

Do not start the old `ecosystem.config.ganatri.js` against the new path.

Later restarts:

```bash
pm2 restart ganatri-in-backend
pm2 restart ganatri-in-google-contacts-worker
```

---



## 6. Build phase (local machine)

From the project root (`Hisab/`):

```bash
git fetch origin
git pull origin

bun install
bun run build

bun turbo prune --scope=backend
# cp apps/backend/.env out/apps/backend/.env
# cp apps/google-contacts-worker/.env out/apps/google-contacts-worker/.env
# If this local .env still says PORT=8001, change the copy used for ganatri.in:
#   (Get-Content out/apps/backend/.env) -replace 'PORT=8001','PORT=8181' | Set-Content out/apps/backend/.env
# Point the Google Contacts worker at the ganatri.in API:
#   (Get-Content out/apps/google-contacts-worker/.env) -replace '127.0.0.1:8001','127.0.0.1:8181' | Set-Content out/apps/google-contacts-worker/.env
cd out
bun install --ignore-scripts
cd apps/backend
bun run build
cd ../../..

```

Build outputs:

- Admin: `apps/admin/dist/`
- POS: `apps/pos/dist/`
- Console: `apps/console/dist/`
- Backend: `out/` (pruned monorepo with compiled `out/apps/backend/dist/` and `out/apps/google-contacts-worker/`)
- Google Contacts worker: `apps/google-contacts-worker/` (Bun source; included in `out/` by prune)

Production env files already bake same-origin `/api`:

- `apps/admin/.env.production` → `BASE_API_URL=/api`, `VITE_POS_ORIGIN=https://pos.ganatri.in`
- `apps/pos/.env.production` → `BASE_API_URL=/api`, `VITE_ADMIN_ORIGIN=https://admin.ganatri.in`
- `apps/console/.env.production` → `BASE_API_URL=/api`

Verify version metadata before upload:

```bash
cat apps/admin/dist/version.json
cat apps/pos/dist/version.json
cat apps/console/dist/version.json
```

---



## 7. Deploy the three webs

WSL:

```bash
rsync -avz --delete --progress \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/apps/admin/dist/ \
  loomsnack:/var/www/ganatri.in/admin/

rsync -avz --delete --progress \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/apps/pos/dist/ \
  loomsnack:/var/www/ganatri.in/pos/

rsync -avz --delete --progress \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/apps/console/dist/ \
  loomsnack:/var/www/ganatri.in/console/
```

PowerShell (if rsync is installed):

```powershell
rsync -avz --delete --progress `
  "C:/Users/smarty/Desktop/loomsnack/Hisab/apps/admin/dist/" `
  loomsnack:/var/www/ganatri.in/admin/

rsync -avz --delete --progress `
  "C:/Users/smarty/Desktop/loomsnack/Hisab/apps/pos/dist/" `
  loomsnack:/var/www/ganatri.in/pos/

rsync -avz --delete --progress `
  "C:/Users/smarty/Desktop/loomsnack/Hisab/apps/console/dist/" `
  loomsnack:/var/www/ganatri.in/console/
```

Do **not** rsync to `/var/www/ganatri.loomsnack.com/frontend/`.

---



## 8. Deploy backend (new path only)

```bash
rsync -avz --delete --progress \
  --exclude=node_modules \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/out/ \
  loomsnack:/var/www/ganatri.in/backend/
```

Then copy the PM2 file if it changed:

```bash
scp docs/development/ecosystem.config.ganatri-in.js \
  loomsnack:/var/www/ganatri.in/backend/ecosystem.config.ganatri-in.cjs
```

`turbo prune --scope=backend` **does** include `apps/google-contacts-worker`.
After rsync, the worker `.env` on the server must use
`GOOGLE_CONTACTS_API_URL=http://127.0.0.1:8181/api` and
the same `GOOGLE_CONTACTS_WORKER_TOKEN` as the backend. If the local worker
`.env` was not copied into `out/`, scp it separately:

```bash
scp apps/google-contacts-worker/.env \
  loomsnack:/var/www/ganatri.in/backend/apps/google-contacts-worker/.env
```

Then on the server change `8001` to `8181` in that file.

---



## 9. After upload (on the server)

```bash
ssh loomsnack

cd /var/www/ganatri.in/backend/apps/backend
bun install --ignore-scripts

# bunx dbmate -d db/migrations up

cd /var/www/ganatri.in/backend
cp ecosystem.config.ganatri-in.cjs ecosystem.config.cjs
pm2 startOrReload ecosystem.config.cjs
pm2 save

pm2 logs ganatri-in-backend --lines 50
pm2 logs ganatri-in-google-contacts-worker --lines 50
```

`pm2 startOrReload` starts `ganatri-in-google-contacts-worker` if it is
missing, and reloads the Backend and Google Contacts services from the
ecosystem file.

Health checks:

```bash
curl -s http://127.0.0.1:8181/api/
curl -s https://ganatri.in/api/
curl -s https://admin.ganatri.in/api/
pm2 status ganatri-in-backend
pm2 status ganatri-in-google-contacts-worker
```

Open in the browser:

- [https://admin.ganatri.in](https://admin.ganatri.in)
- [https://pos.ganatri.in](https://pos.ganatri.in)
- [https://console.ganatri.in](https://console.ganatri.in)
- [https://ganatri.in](https://ganatri.in)  (should redirect to Admin)

New frontend metadata:

```bash
curl -fsS https://admin.ganatri.in/version.json
curl -fsS https://pos.ganatri.in/version.json
curl -fsS https://console.ganatri.in/version.json
```

---



## 10. Optional: seed / console owner

Do not re-run `add-initial-data` against the shared database if production
already has data.

If Console needs an Owner User and one does not exist yet, deploy a backend
build that includes `dist/scripts/console-create-owner.js`, then run it on the
new backend cwd (same DB). Do not pass the password as an argument:

```bash
cd /var/www/ganatri.in/backend/apps/backend
bun run console:create-owner
# same command:
bun run owner:create
```

---

## Stop the retired Ganatri.loomsnack.com host

Do this after Admin, POS, Console, `https://ganatri.in/api`, and Google
Contacts are verified. Delete the retired API process so it cannot come back
on reboot.

```bash
ssh loomsnack

# Old API
pm2 stop ganatri-backend
pm2 delete ganatri-backend

pm2 save
pm2 list
```

`pm2 list` must show `ganatri-in-backend` and
`ganatri-in-google-contacts-worker`. It must **not** show `ganatri-backend`.

Confirm the old port is free and the new stack is healthy:

```bash
ss -tlnp | grep -E '8001|8181'
curl -s http://127.0.0.1:8181/api/
curl -s http://127.0.0.1:8001/api/   # should fail
```

Optionally stop serving the old hostname:

```bash
rm -f /etc/nginx/sites-enabled/ganatri.loomsnack.com
nginx -t && systemctl reload nginx
```

Leave `/etc/nginx/sites-available/ganatri.loomsnack.com` and
`/var/www/ganatri.loomsnack.com` on disk until you are sure you do not need
a rollback. Do not rsync `--delete` into the old tree.

---



## Quick reference

| Task | Command |
|------|---------|
| SSH | `ssh loomsnack` |
| Full local build | `bun i && bun run build && bun turbo prune --scope=backend && cp apps/backend/.env out/apps/backend/.env && cp apps/google-contacts-worker/.env out/apps/google-contacts-worker/.env && cd out && bun install --ignore-scripts && cd apps/backend && bun run build && cd ../../..` |
| Sync Admin | rsync `--delete` `apps/admin/dist/` → `/var/www/ganatri.in/admin/` |
| Sync POS | rsync `--delete` `apps/pos/dist/` → `/var/www/ganatri.in/pos/` |
| Sync Console | rsync `--delete` `apps/console/dist/` → `/var/www/ganatri.in/console/` |
| Sync backend | rsync `out/` → `/var/www/ganatri.in/backend/` (exclude `node_modules`; includes Google Contacts worker) |
| Sync Google Contacts worker env | scp `apps/google-contacts-worker/.env` if it was not copied into `out/`; set API URL to `http://127.0.0.1:8181/api` |
| Install on server | `cd /var/www/ganatri.in/backend/apps/backend && bun install --ignore-scripts` |
| Restart API | `pm2 restart ganatri-in-backend` |
| Restart Google Contacts worker | `pm2 restart ganatri-in-google-contacts-worker` |
| Stop old stack | `pm2 delete ganatri-backend && pm2 save` |
| nginx test | `nginx -t && systemctl reload nginx` |

---



## What was updated in the repo for this host

| File | Why |
|------|-----|
| `apps/backend/src/app.ts` | Production CORS allows `ganatri.in`, `admin`, `pos`, `console` |
| `packages/services/src/api.ts` | Fallback API URL is now `https://ganatri.in/api` |
| `apps/admin/.env.production` | Same-origin `/api`; POS link is `https://pos.ganatri.in` |
| `apps/pos/.env.production` | Same-origin `/api`; Admin link is `https://admin.ganatri.in` |
| `apps/console/.env.production` | Same-origin `/api` |
| nginx files in this folder | New hosts proxy `/api` to **8181** |
| `ecosystem.config.ganatri-in.js` | PM2 apps `ganatri-in-backend` (8181) and `ganatri-in-google-contacts-worker` |
| `apps/backend/package.json` | Workspace dep on `google-contacts-worker` so `turbo prune --scope=backend` includes it |

Cookies stay host-only (no `Domain=.ganatri.in`). That is intentional: Admin,
POS, and Console sessions must not leak across subdomains.

---



## Troubleshooting

**502 on** `/api/`* — new backend not running:

```bash
pm2 status ganatri-in-backend
curl http://127.0.0.1:8181/api/
ss -tlnp | grep 8181
```

**WhatsApp messages not sending** — WhatsApp Cloud API requests and durable
outbox processing run in the Backend. Check the Cloud account, template,
webhook, outbox, and provider error details using the
[WhatsApp operations runbook](whatsapp-operations-runbook.md), then inspect:

```bash
pm2 status ganatri-in-backend
pm2 logs ganatri-in-backend --lines 100
curl http://127.0.0.1:8181/api/
```

**Google Contacts stay pending after initial sync** — the dedicated worker is
not running, or its `.env` token/URL does not match the backend. Confirm
`ganatri-in-google-contacts-worker` is online, the worker `.env` uses
`GOOGLE_CONTACTS_API_URL=http://127.0.0.1:8181/api` and the same
`GOOGLE_CONTACTS_WORKER_TOKEN` as the backend, then:

```bash
pm2 status ganatri-in-google-contacts-worker
pm2 logs ganatri-in-google-contacts-worker --lines 50
```

Queued outbox rows do not need another "Run initial sync" once the worker is
up. The worker has no health HTTP port.

**Certbot fails** — DNS A records not pointing here yet, or Cloudflare proxy
is on, or port 80 is closed. Fix DNS, wait for propagation, retry.

**CORS errors** — each web must call its own origin `/api` (already baked).
If a browser calls `https://ganatri.in/api` from a subdomain, CORS must allow
that subdomain (already listed in `app.ts`). Rebuild the backend after CORS
changes.

**Admin "Open POS" goes to localhost** — rebuild Admin after
`apps/admin/.env.production` has `VITE_POS_ORIGIN=https://pos.ganatri.in`.

**POS "Admin login" goes to localhost** — rebuild POS after
`apps/pos/.env.production` has `VITE_ADMIN_ORIGIN=https://admin.ganatri.in`.

**SSH still asks for a password** — public key not in `authorized_keys`, or
`IdentitiesOnly` is missing so ssh tries other keys first. Re-run the install
command in section 0.

---



## Full copy-paste flow (repeat deploys of ganatri.in)

**Local:**

```bash
cd /mnt/c/Users/smarty/Desktop/loomsnack/Hisab
git pull
bun i && bun run build
bun turbo prune --scope=backend
cp apps/backend/.env out/apps/backend/.env
cp apps/google-contacts-worker/.env out/apps/google-contacts-worker/.env
cd out && bun install --ignore-scripts && cd apps/backend && bun run build && cd ../../..

rsync -avz --delete --progress apps/admin/dist/ loomsnack:/var/www/ganatri.in/admin/
rsync -avz --delete --progress apps/pos/dist/ loomsnack:/var/www/ganatri.in/pos/
rsync -avz --delete --progress apps/console/dist/ loomsnack:/var/www/ganatri.in/console/
rsync -avz --delete --progress \
  --exclude=node_modules \
  out/ loomsnack:/var/www/ganatri.in/backend/
scp apps/google-contacts-worker/.env \
  loomsnack:/var/www/ganatri.in/backend/apps/google-contacts-worker/.env
```

After scp, on the server set
`GOOGLE_CONTACTS_API_URL=http://127.0.0.1:8181/api` on the Google Contacts
worker `.env`. The Google Contacts worker token must match the backend.

**Server:**

```bash
ssh loomsnack
cd /var/www/ganatri.in/backend/apps/backend && bun install --ignore-scripts
# confirm PORT=8181 in backend .env if rsync overwrote it
cd /var/www/ganatri.in/backend
cp ecosystem.config.ganatri-in.cjs ecosystem.config.cjs
pm2 startOrReload ecosystem.config.cjs
pm2 save
```

`pm2 restart ganatri-in-google-contacts-worker` only works after the app already
exists. The first time you add it, `pm2 startOrReload` is required.

```bash
curl -s http://127.0.0.1:8181/api/
pm2 status ganatri-in-google-contacts-worker
```

