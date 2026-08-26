# Ganatri.in Deployment Guide

Deploy **ganatri.in** on the Ubuntu VPS at `216.158.228.89`. This is the live
Ganatri stack. `ganatri.loomsnack.com` is retired: stop its backend and
WhatsApp worker (see [Stop ganatri.loomsnack.com](#stop-ganatriloomsnackcom)).

The previous host guide stays in `docs/development/ganatri_deployment_guide.md`
for history only. Do not rsync new builds into `/var/www/ganatri.loomsnack.com`.

| Piece | Stack | Server path | Port |
|-------|-------|-------------|------|
| Admin web | Vite static (`apps/admin`) | `/var/www/ganatri.in/admin/` | — |
| POS web | Vite static (`apps/pos`) | `/var/www/ganatri.in/pos/` | — |
| Console web | Vite static (`apps/console`) | `/var/www/ganatri.in/console/` | — |
| Backend | Bun + Hono (PM2 `ganatri-in-backend`) | `/var/www/ganatri.in/backend/` | **8181** |
| Canonical API | nginx | `https://ganatri.in/api` → `127.0.0.1:8181` | — |
| WhatsApp worker | Node 20 + Baileys (PM2 `ganatri-in-whatsapp-worker`) | `/var/www/ganatri.in/backend/apps/whatsapp-worker/` | **8100** |

**Ports on this VPS:** `boxmap-backend` uses **8000**. The retired Ganatri
process used **8001**. ganatri.in uses **8181**. The WhatsApp worker stays on
**8100** (only one worker process).

**Same database / Redis / MinIO.** Do not create a second Postgres database.

**Never run two WhatsApp workers.** Two Baileys processes fight over the same
linked account. Stop `ganatri-whatsapp-worker` before starting
`ganatri-in-whatsapp-worker`.

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

| Type | Host / Name | Value | TTL |
|------|-------------|-------|-----|
| A | `@` (apex / ganatri.in) | `216.158.228.89` | 300 |
| A | `www` | `216.158.228.89` | 300 |
| A | `admin` | `216.158.228.89` | 300 |
| A | `pos` | `216.158.228.89` | 300 |
| A | `console` | `216.158.228.89` | 300 |

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

Also create the WhatsApp worker directories once:

```bash
mkdir -p /var/www/ganatri.in/backend/apps/whatsapp-worker/dist
mkdir -p /var/www/ganatri.in/backend/apps/whatsapp-worker/data/whatsapp-auth
```

Confirm ports:

```bash
ss -tlnp | grep -E '8001|8181|8100'
```

After cutover, 8181 (new API) and 8100 (new worker) should be listening. 8001 must be empty.

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
and WhatsApp worker settings exactly as they are on the live backend. In
particular keep:

```env
WHATSAPP_WORKER_URL=http://127.0.0.1:8100
WHATSAPP_WORKER_TOKEN=<same token as the live backend>
```

Locally, keep `apps/backend/.env` on `PORT=8001` for development. For each
ganatri.in backend upload, either:

- rsync `out/` and then restore `PORT=8181` on the server file, or
- copy the live `.env` into `out/apps/backend/.env`, set `PORT=8181` there,
  then rsync.

PM2 also forces `PORT=8181` in `ecosystem.config.ganatri-in.js`.

### WhatsApp worker `.env`

Copy the live worker env onto the new path, then point callbacks at **8181**:

```bash
ssh loomsnack

mkdir -p /var/www/ganatri.in/backend/apps/whatsapp-worker
cp /var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker/.env \
  /var/www/ganatri.in/backend/apps/whatsapp-worker/.env

nano /var/www/ganatri.in/backend/apps/whatsapp-worker/.env
```

The only required change versus the old worker file:

```env
WHATSAPP_API_URL=http://127.0.0.1:8181/api
```

Keep `WHATSAPP_WORKER_PORT=8100`, `WHATSAPP_WORKER_TOKEN` (must match the
backend), `WHATSAPP_AUTH_ENCRYPTION_KEY`, and
`WHATSAPP_AUTH_STATE_DIRECTORY=./data/whatsapp-auth`.

Never rsync `--delete` the worker `data/` directory. That encrypted auth
state is not in git and is not in `out/`. Backend `out/` rsync must exclude
`apps/whatsapp-worker` so `--delete` cannot wipe worker `data/` or `dist/`.

### Google Contacts OAuth

Production Google Contacts Synchronization needs a verified OAuth client, the
Admin redirect URI `https://admin.ganatri.in/google-contacts/oauth/callback`,
consent-screen identity, privacy/support URLs, and Contacts scope verification.
Set `GOOGLE_CONTACTS_OAUTH_REDIRECT_URI` to that production callback and keep
the client secret, state secret, and credential keyring in backend `.env` only.
See [Google Contacts OAuth production readiness](./google-contacts-oauth-production.md).

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

`pm2 list` must show **`ganatri-in-backend`** and
**`ganatri-in-whatsapp-worker`**, plus whatever else already runs (boxmap,
etc.). The worker entry runs `node dist/index.js` and loads
`apps/whatsapp-worker/.env` through PM2. It does not run under Bun.

Do not start the old `ecosystem.config.ganatri.js` against the new path. After
cutover, `ganatri-backend` and `ganatri-whatsapp-worker` must be stopped and
deleted.

Later restarts:

```bash
pm2 restart ganatri-in-backend
pm2 restart ganatri-in-whatsapp-worker
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
cp apps/backend/.env out/apps/backend/.env
# If this local .env still says PORT=8001, change the copy used for ganatri.in:
#   (Get-Content out/apps/backend/.env) -replace 'PORT=8001','PORT=8181' | Set-Content out/apps/backend/.env
cd out
bun install --ignore-scripts
cd apps/backend
bun run build
cd ../../..

# Node-targeted WhatsApp worker bundle (do not start this with Bun).
bun run --cwd apps/whatsapp-worker build
```

Build outputs:

- Admin: `apps/admin/dist/`
- POS: `apps/pos/dist/`
- Console: `apps/console/dist/`
- Backend: `out/` (pruned monorepo with compiled `out/apps/backend/dist/`)
- WhatsApp worker: `apps/whatsapp-worker/dist/` (Node-targeted bundle)

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
  --exclude=apps/whatsapp-worker \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/out/ \
  loomsnack:/var/www/ganatri.in/backend/
```

Then copy the PM2 file if it changed:

```bash
scp docs/development/ecosystem.config.ganatri-in.js \
  loomsnack:/var/www/ganatri.in/backend/ecosystem.config.ganatri-in.cjs
```

`--exclude=apps/whatsapp-worker` is required. `turbo prune --scope=backend`
does not include the worker. `--delete` without that exclude removes worker
`dist/` and `data/`.

## 8.1 Deploy WhatsApp worker

The worker bundle is deployed separately from the pruned backend. Rsync the
worker `.env` with the same production token as the backend. Exclude only
encrypted auth state so a code deploy cannot log out the linked account.

**First cutover only:** stop the old worker, then copy its auth state before
starting the new process. Two workers must never run at the same time.

```bash
ssh loomsnack "mkdir -p /var/www/ganatri.in/backend/apps/whatsapp-worker/dist \
  /var/www/ganatri.in/backend/apps/whatsapp-worker/data/whatsapp-auth"

# Stop the retired worker first so it is not writing auth files during the copy.
ssh loomsnack "pm2 stop ganatri-whatsapp-worker"

ssh loomsnack "cp -a /var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker/data/. \
  /var/www/ganatri.in/backend/apps/whatsapp-worker/data/"
```

Then from the local machine:

```bash
rsync -avz --delete --progress \
  --exclude=data/ \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/apps/whatsapp-worker/dist/ \
  loomsnack:/var/www/ganatri.in/backend/apps/whatsapp-worker/dist/

scp /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/apps/whatsapp-worker/.env \
  loomsnack:/var/www/ganatri.in/backend/apps/whatsapp-worker/.env
```

On the server, confirm the copied `.env` has `WHATSAPP_API_URL=http://127.0.0.1:8181/api`
(the local file still points at 8001). Then copy the updated ecosystem file:

```bash
scp docs/development/ecosystem.config.ganatri-in.js \
  loomsnack:/var/www/ganatri.in/backend/ecosystem.config.ganatri-in.cjs
```

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
pm2 logs ganatri-in-whatsapp-worker --lines 50
```

`pm2 startOrReload` starts `ganatri-in-whatsapp-worker` if it is missing, and
reloads both apps from the ecosystem file. Confirm `ganatri-whatsapp-worker`
is already stopped before this, or you will have two workers on port 8100.

Health checks:

```bash
curl -s http://127.0.0.1:8181/api/
curl -s https://ganatri.in/api/
curl -s https://admin.ganatri.in/api/
curl -fsS http://127.0.0.1:8100/health
curl -fsS http://127.0.0.1:8100/health/ready
pm2 status ganatri-in-backend
pm2 status ganatri-in-whatsapp-worker
```

Open in the browser:

- https://admin.ganatri.in
- https://pos.ganatri.in
- https://console.ganatri.in
- https://ganatri.in  (should redirect to Admin)

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

## Stop ganatri.loomsnack.com

Do this after Admin, POS, Console, `https://ganatri.in/api`, and the new
WhatsApp worker are verified. Stop the old worker **before** starting the
new one (section 8.1). Then delete the retired PM2 apps so they cannot come
back on reboot.

```bash
ssh loomsnack

# Old WhatsApp worker (must already be stopped if the new worker is up)
pm2 stop ganatri-whatsapp-worker
pm2 delete ganatri-whatsapp-worker

# Old API
pm2 stop ganatri-backend
pm2 delete ganatri-backend

pm2 save
pm2 list
```

`pm2 list` must show `ganatri-in-backend` and `ganatri-in-whatsapp-worker`.
It must **not** show `ganatri-backend` or `ganatri-whatsapp-worker`.

Confirm the old port is free and the new stack is healthy:

```bash
ss -tlnp | grep -E '8001|8181|8100'
curl -s http://127.0.0.1:8181/api/
curl -fsS http://127.0.0.1:8100/health
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
| Full local build | `bun i && bun run build && bun turbo prune --scope=backend && cp apps/backend/.env out/apps/backend/.env && cd out && bun install --ignore-scripts && cd apps/backend && bun run build && cd ../../.. && bun run --cwd apps/whatsapp-worker build` |
| Sync Admin | rsync `--delete` `apps/admin/dist/` → `/var/www/ganatri.in/admin/` |
| Sync POS | rsync `--delete` `apps/pos/dist/` → `/var/www/ganatri.in/pos/` |
| Sync Console | rsync `--delete` `apps/console/dist/` → `/var/www/ganatri.in/console/` |
| Sync backend | rsync `out/` → `/var/www/ganatri.in/backend/` (exclude `node_modules`, `apps/whatsapp-worker`) |
| Sync worker | rsync `apps/whatsapp-worker/dist/` → `.../apps/whatsapp-worker/dist/` (exclude `data/`); scp worker `.env` |
| Install on server | `cd /var/www/ganatri.in/backend/apps/backend && bun install --ignore-scripts` |
| Restart API | `pm2 restart ganatri-in-backend` |
| Restart worker | `pm2 restart ganatri-in-whatsapp-worker` |
| Stop old stack | `pm2 delete ganatri-backend ganatri-whatsapp-worker && pm2 save` |
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
| `ecosystem.config.ganatri-in.js` | PM2 apps `ganatri-in-backend` (8181) and `ganatri-in-whatsapp-worker` (8100) |

Cookies stay host-only (no `Domain=.ganatri.in`). That is intentional: Admin,
POS, and Console sessions must not leak across subdomains.

---

## Troubleshooting

**502 on `/api/*`** — new backend not running:

```bash
pm2 status ganatri-in-backend
curl http://127.0.0.1:8181/api/
ss -tlnp | grep 8181
```

**WhatsApp worker down / invoices not queued** — only one worker may listen on
8100. Confirm the old process is gone:

```bash
pm2 list
curl -fsS http://127.0.0.1:8100/health
curl -fsS http://127.0.0.1:8100/health/ready
pm2 logs ganatri-in-whatsapp-worker --lines 50
ss -tlnp | grep 8100
```

**`EADDRINUSE` on 8100** — `ganatri-whatsapp-worker` is still running. Stop and
delete it, then `pm2 restart ganatri-in-whatsapp-worker`.

**Worker logged out after deploy** — `data/` was deleted or not copied. Restore
`/var/www/ganatri.in/backend/apps/whatsapp-worker/data/` from the old path (or
a backup) and restart the worker. Never rsync `--delete` without `--exclude=data/`.

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
cd out && bun install --ignore-scripts && cd apps/backend && bun run build && cd ../../..
bun run --cwd apps/whatsapp-worker build

rsync -avz --delete --progress apps/admin/dist/ loomsnack:/var/www/ganatri.in/admin/
rsync -avz --delete --progress apps/pos/dist/ loomsnack:/var/www/ganatri.in/pos/
rsync -avz --delete --progress apps/console/dist/ loomsnack:/var/www/ganatri.in/console/
rsync -avz --delete --progress \
  --exclude=node_modules \
  --exclude=apps/whatsapp-worker \
  out/ loomsnack:/var/www/ganatri.in/backend/
rsync -avz --delete --progress --exclude=data/ \
  apps/whatsapp-worker/dist/ \
  loomsnack:/var/www/ganatri.in/backend/apps/whatsapp-worker/dist/
scp apps/whatsapp-worker/.env \
  loomsnack:/var/www/ganatri.in/backend/apps/whatsapp-worker/.env
```

After scp, on the server set `WHATSAPP_API_URL=http://127.0.0.1:8181/api` if
the local worker `.env` still points at 8001.

**Server:**

```bash
ssh loomsnack
cd /var/www/ganatri.in/backend/apps/backend && bun install --ignore-scripts
# confirm PORT=8181 in backend .env if rsync overwrote it
cd /var/www/ganatri.in/backend
cp ecosystem.config.ganatri-in.cjs ecosystem.config.cjs
pm2 restart ganatri-in-backend
pm2 restart ganatri-in-whatsapp-worker
```

```bash
curl -s http://127.0.0.1:8181/api/
curl -fsS http://127.0.0.1:8100/health
```
