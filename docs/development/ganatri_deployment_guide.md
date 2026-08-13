# Ganatri Deployment Guide

Deploy **ganatri.loomsnack.com** on the Ubuntu VPS at `216.158.228.89` (same machine as `loomsnack.com` and `boxmap.loomsnack.com`).

| Piece | Stack | Server path |
|-------|-------|-------------|
| Frontend | React static build (Vite) | `/var/www/ganatri.loomsnack.com/frontend/` |
| Backend | Bun + Hono (PM2) | `/var/www/ganatri.loomsnack.com/backend/` |
| WhatsApp worker | Node 20 + Baileys (PM2) | `/var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker/` |
| Reverse proxy | nginx | `/api` → `127.0.0.1:8001` |

**Port note:** `boxmap-backend` already uses port **8000**. Ganatri uses **8001** so both apps can run on the same VPS.

---

## 0. One-time server setup (SSH)

```bash
ssh root@216.158.228.89

mkdir -p /var/www/ganatri.loomsnack.com/frontend
mkdir -p /var/www/ganatri.loomsnack.com/backend
```

### DNS

Add an **A record** for `ganatri.loomsnack.com` → `216.158.228.89`.

### Install Bun (if not already on the server)

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
bun --version
```

### Install Node.js 20+ (required by the WhatsApp worker)

The backend continues to use its existing Bun/Hono runtime. The isolated
WhatsApp worker must be started with Node 20 or newer; do not start it with Bun.

```bash
node --version
npm --version
pm2 --version
```

If Node or PM2 is missing, install the approved Node 20 LTS distribution for
the server and then install PM2 globally:

```bash
npm install --global pm2
```

### PostgreSQL + Redis (first time only)

The API needs PostgreSQL and Redis on the VPS (or reachable from it).

```bash
# Example: create DB (adjust user/password to match your server)
sudo -u postgres psql -c "CREATE DATABASE ganatri;"
```

Run migrations after the first backend deploy (see section 4).

### nginx + SSL

Copy `ganatri.loomsnack.com` from this repo onto the server:

```bash
nano /etc/nginx/sites-available/ganatri.loomsnack.com
# paste contents from docs/development/ganatri.loomsnack.com

ln -s /etc/nginx/sites-available/ganatri.loomsnack.com /etc/nginx/sites-enabled/

nginx -t
systemctl reload nginx

# First-time certificate (HTTP must reach the server on port 80)
certbot --nginx -d ganatri.loomsnack.com
nginx -t && systemctl reload nginx
```

If `loomsnack.com` already has a wildcard cert for `*.loomsnack.com`, you can skip certbot and reuse that cert path (as in `boxmap.loomsnack.com`).

### Backend `.env` on server (first time only)

Create `/var/www/ganatri.loomsnack.com/backend/apps/backend/.env` (never commit this file):

```bash
nano /var/www/ganatri.loomsnack.com/backend/apps/backend/.env
```

Use `apps/backend/.env.example` as a template. Production values:

```env
BASE_PATH="/api"
PORT=8001

DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/ganatri?sslmode=disable

REDIS_URL=redis://localhost:6379

MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_BUCKET_NAME=ganatri

JWT_SECRET=change_me_to_a_long_random_string
DEVICE_SECRET_ENCRYPTION_KEY=change_me_optional

EMAIL_PORT=587
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_app_password

# Isolated Baileys worker connection. This token must match the worker .env.
WHATSAPP_WORKER_URL=http://127.0.0.1:8100
WHATSAPP_WORKER_TOKEN=replace-with-a-long-random-shared-secret
WHATSAPP_MAX_PENDING_OUTBOX_PER_ACCOUNT=1000

# Optional legacy Cloud API path; it is separate from the worker's internal
# WHATSAPP_API_URL and can remain unused by the Baileys invoice flow.
WHATSAPP_API_URL=https://graph.facebook.com/v22.0/<phone_number_id>/messages
WHATSAPP_API_TOKEN=your_whatsapp_api_token
```

### WhatsApp worker `.env` on server (first time only)

Create `/var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker/.env` and
never commit it:

```bash
mkdir -p /var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker/data/whatsapp-auth
nano /var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker/.env
```

Use `apps/whatsapp-worker/.env.example` as the template. For this deployment,
the internal API URL points to the Bun backend on port 8001:

```env
WHATSAPP_WORKER_HOST=127.0.0.1
WHATSAPP_WORKER_PORT=8100
WHATSAPP_WORKER_ID=whatsapp-worker-0
WHATSAPP_API_URL=http://127.0.0.1:8001/api
WHATSAPP_WORKER_TOKEN=the-same-long-random-secret-used-by-the-backend
WHATSAPP_AUTH_ENCRYPTION_KEY=at-least-32-random-bytes
WHATSAPP_AUTH_STATE_DIRECTORY=/var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker/data/whatsapp-auth
WHATSAPP_WORKER_PARTITION_COUNT=1
WHATSAPP_WORKER_PARTITION_INDEX=0
WHATSAPP_WORKER_DISPATCH_CONCURRENCY=2
WHATSAPP_SYNC_FULL_HISTORY=false
WHATSAPP_MESSAGE_STORE_LIMIT=2000
WHATSAPP_MAX_MEDIA_BYTES=10485760
WHATSAPP_MINIMUM_SEND_INTERVAL_MS=750
WHATSAPP_WORKER_SHUTDOWN_TIMEOUT_MS=30000
WHATSAPP_WORKER_OPERATIONS_REFRESH_MS=15000
```

Generate secrets instead of using the placeholders:

```bash
openssl rand -hex 32  # WHATSAPP_WORKER_TOKEN
openssl rand -hex 32  # WHATSAPP_AUTH_ENCRYPTION_KEY
```

Keep the encrypted auth-state directory persistent across deployments and
worker restarts. Never use `rsync --delete` against its parent without excluding
`data/` and `.env`.

### PM2 (first time only)

Copy the ecosystem file to the server, then start the app:

```bash
# From your local machine (after first backend rsync), or paste ecosystem on server:
nano /var/www/ganatri.loomsnack.com/backend/ecosystem.config.ganatri.cjs
# paste contents from docs/development/ecosystem.config.ganatri.js

cd /var/www/ganatri.loomsnack.com/backend/apps/backend
bun install --ignore-scripts

cd /var/www/ganatri.loomsnack.com/backend
cp ecosystem.config.ganatri.cjs ecosystem.config.cjs
pm2 start ecosystem.config.cjs
pm2 save
```

`pm2 list` must show both **`ganatri-backend`** and
**`ganatri-whatsapp-worker`**. The worker entry uses:
`node --env-file=.env dist/index.js`; it does not run under Bun.

---

## 1. Build phase (local machine)

From the project root (`Hisab/`):

```bash
git fetch origin
git pull origin

bun install
bun run build

# Pruned backend bundle (smaller deploy, same pattern as TenderSense)
bun turbo prune --scope=backend
cd out
bun install --ignore-scripts
cd apps/backend
bun run build
cd ../../..

# Build the Node-targeted WhatsApp worker bundle.
bun run --cwd apps/whatsapp-worker build
```

Build outputs:

- Frontend: `apps/web/dist/`
- Backend: `out/` (pruned monorepo with compiled `out/apps/backend/dist/`)
- WhatsApp worker: `apps/whatsapp-worker/dist/` (Node-targeted bundle)

The frontend build generates `apps/web/dist/version.json` from the root
`package.json` version and the current Git commit. For a user-facing release,
bump the `version` field in the root `package.json` (for example, `0.0.1` to
`0.0.2`) before building. The root package is the version source; do not use a
manually edited `version.json` in `apps/web/public/`.

Verify the generated metadata before uploading:

```bash
cat apps/web/dist/version.json
test -f apps/web/dist/version.json
```

The nginx config keeps `version.json` and `index.html` revalidated so open
browser tabs can detect a new frontend build.

`apps/web/.env.production` sets `BASE_API_URL=/api` so the built frontend talks to nginx same-origin.

---

## 2. Deploy frontend

### Windows (WSL)

```bash
rsync -avz --delete --progress \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/apps/web/dist/ \
  root@216.158.228.89:/var/www/ganatri.loomsnack.com/frontend/
```

### PowerShell (if rsync is installed)

```powershell
rsync -avz --delete --progress `
  "C:/Users/smarty/Desktop/loomsnack/Hisab/apps/web/dist/" `
  root@216.158.228.89:/var/www/ganatri.loomsnack.com/frontend/
```

### Update nginx configuration (only when the nginx file changes)

Frontend deployments do not require an nginx reload. Update nginx only when
`docs/development/ganatri.loomsnack.com` changes, such as cache headers or the
API proxy configuration.

From the local project root:

```bash
scp docs/development/ganatri.loomsnack.com \
  root@216.158.228.89:/etc/nginx/sites-available/ganatri.loomsnack.com

ssh root@216.158.228.89 "nginx -t && systemctl reload nginx"
```

`nginx -t` must pass before the reload is applied. Verify the cache behavior
afterward:

```bash
curl -fsSI "https://ganatri.loomsnack.com/version.json?check=nginx" | grep -i cache-control
curl -fsSI https://ganatri.loomsnack.com/index.html | grep -i cache-control
```

---

## 3. Deploy backend (pruned, without node_modules)

```bash
rsync -avz --delete --progress \
  --exclude=node_modules \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/out/ \
  root@216.158.228.89:/var/www/ganatri.loomsnack.com/backend/
```

Also sync the PM2 ecosystem file (first deploy or when it changes):

```bash
scp /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/docs/development/ecosystem.config.ganatri.js \
  root@216.158.228.89:/var/www/ganatri.loomsnack.com/backend/ecosystem.config.ganatri.cjs
```

## 3.1 Deploy WhatsApp worker

The worker bundle is deployed separately from the pruned backend. Exclude the
worker `.env` and encrypted auth state so a code deployment cannot overwrite
secrets or log out the linked account:

```bash
ssh root@216.158.228.89 "mkdir -p /var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker/dist"

rsync -avz --delete \
  --exclude=.env \
  --exclude=data/ \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/apps/whatsapp-worker/dist/ \
  root@216.158.228.89:/var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker/dist/
```

Copy the updated PM2 ecosystem file whenever its worker entry changes:

```bash
scp /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/docs/development/ecosystem.config.ganatri.js \
  root@216.158.228.89:/var/www/ganatri.loomsnack.com/backend/ecosystem.config.ganatri.cjs
```

---

## 4. After upload (on server)

```bash
ssh root@216.158.228.89

cd /var/www/ganatri.loomsnack.com/backend/apps/backend
bun install --ignore-scripts

# Run DB migrations (first deploy and after new migrations)
bunx dbmate -d db/migrations up

cd /var/www/ganatri.loomsnack.com/backend
cp ecosystem.config.ganatri.cjs ecosystem.config.cjs
pm2 startOrRestart ecosystem.config.cjs
pm2 save

pm2 logs ganatri-backend --lines 50
pm2 logs ganatri-whatsapp-worker --lines 50
```

Health check:

```bash
curl -s http://127.0.0.1:8001/api/
```

WhatsApp worker health checks:

```bash
curl -fsS http://127.0.0.1:8100/health
curl -fsS http://127.0.0.1:8100/health/ready
pm2 status ganatri-whatsapp-worker
```

The worker's `/health` and `/health/ready` endpoints are local liveness/readiness
checks. `/metrics` requires the worker bearer token and should not be exposed
publicly through nginx:

```bash
curl -fsS \
  -H "Authorization: Bearer $WHATSAPP_WORKER_TOKEN" \
  http://127.0.0.1:8100/metrics
```

Then open `https://ganatri.loomsnack.com` in the browser.

Verify that the deployed frontend exposes the new build metadata:

```bash
curl -fsS https://ganatri.loomsnack.com/version.json
```

The returned `version` should match the root `package.json`, and `build` should
match the Git commit used for the deployment.

---

## 5. Optional: seed data

```bash
cd /var/www/ganatri.loomsnack.com/backend/apps/backend
bun run add-initial-data
```

---

## Quick reference

| Task | Command |
|------|---------|
| Full local build | `bun i && bun run build && bun turbo prune --scope=backend && cd out && bun install --ignore-scripts && cd apps/backend && bun run build` |
| Sync frontend | rsync `--delete` `apps/web/dist/` → `.../frontend/` |
| Sync backend | rsync `out/` → `.../backend/` (exclude `node_modules`) |
| Sync worker | rsync `apps/whatsapp-worker/dist/` → `.../backend/apps/whatsapp-worker/dist/` (exclude `.env`, `data/`) |
| Install on server | `cd .../backend/apps/backend && bun install --ignore-scripts` |
| Migrations | `bunx dbmate -d db/migrations up` |
| Restart API | `pm2 restart ganatri-backend` |
| Restart worker | `pm2 restart ganatri-whatsapp-worker` |
| API logs | `pm2 logs ganatri-backend` |
| Worker logs | `pm2 logs ganatri-whatsapp-worker` |
| nginx test | `nginx -t && systemctl reload nginx` |

---

## Troubleshooting

**502 on `/api/*`** — backend not running or wrong port:

```bash
pm2 status ganatri-backend
curl http://127.0.0.1:8001/api/
ss -tlnp | grep 8001
```

**Port conflict with boxmap** — Ganatri must use **8001**, not 8000. Confirm `PORT=8001` in server `.env` and PM2 ecosystem file.

**Frontend calls wrong API URL** — rebuild web after changing `apps/web/.env.production`:

```bash
cd apps/web && bun run build
# re-rsync dist/
```

**CORS errors** — with same-origin nginx (`/` + `/api` on one domain), the browser should not need CORS. If you test from another origin, add it in `apps/backend/src/app.ts` `allowedOrigins`.

**Frontend 404 on refresh** — nginx needs `try_files $uri $uri/ /index.html` (already in `ganatri.loomsnack.com` config).

**Redis connection failed** — ensure Redis is running: `systemctl status redis` or `redis-cli ping`.

**Certbot fails** — confirm DNS A record and port 80 open before `certbot --nginx`.

---

## Full copy-paste flow (repeat deploys)

**Local:**

```bash
cd /mnt/c/Users/smarty/Desktop/loomsnack/Hisab
git pull
bun i && bun run build
bun turbo prune --scope=backend
cd out && bun install --ignore-scripts && cd apps/backend && bun run build && cd ../../..

rsync -avz --delete --progress apps/web/dist/ root@216.158.228.89:/var/www/ganatri.loomsnack.com/frontend/
rsync -avz --delete --progress --exclude=node_modules out/ root@216.158.228.89:/var/www/ganatri.loomsnack.com/backend/
```

**Server:**

```bash
ssh root@216.158.228.89
cd /var/www/ganatri.loomsnack.com/backend/apps/backend && bun install --ignore-scripts
cd /var/www/ganatri.loomsnack.com/backend && pm2 restart ganatri-backend
```
