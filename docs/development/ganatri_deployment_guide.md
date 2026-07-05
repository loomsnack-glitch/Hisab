# Ganatri (Hisab) Deployment Guide

Deploy **ganatri.loomsnack.com** on the Ubuntu VPS at `216.158.228.89` (same machine as `loomsnack.com` and `boxmap.loomsnack.com`).

| Piece | Stack | Server path |
|-------|-------|-------------|
| Frontend | React static build (Vite) | `/var/www/ganatri.loomsnack.com/frontend/` |
| Backend | Bun + Hono (PM2) | `/var/www/ganatri.loomsnack.com/backend/` |
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
```

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

`pm2 list` must show **`ganatri-backend`**.

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
bun install --ignore-scripts --ignore-scripts
cd apps/backend
bun run build
cd ../../..
```

Build outputs:

- Frontend: `apps/web/dist/`
- Backend: `out/` (pruned monorepo with compiled `out/apps/backend/dist/`)

`apps/web/.env.production` sets `BASE_API_URL=/api` so the built frontend talks to nginx same-origin.

---

## 2. Deploy frontend

### Windows (WSL)

```bash
rsync -avz --progress \
  /mnt/c/Users/smarty/Desktop/loomsnack/Hisab/apps/web/dist/ \
  root@216.158.228.89:/var/www/ganatri.loomsnack.com/frontend/
```

### PowerShell (if rsync is installed)

```powershell
rsync -avz --progress `
  "C:/Users/smarty/Desktop/loomsnack/Hisab/apps/web/dist/" `
  root@216.158.228.89:/var/www/ganatri.loomsnack.com/frontend/
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
pm2 restart ecosystem.config.cjs

pm2 logs ganatri-backend --lines 50
```

Health check:

```bash
curl -s http://127.0.0.1:8001/api/
```

Then open `https://ganatri.loomsnack.com` in the browser.

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
| Sync frontend | rsync `apps/web/dist/` → `.../frontend/` |
| Sync backend | rsync `out/` → `.../backend/` (exclude `node_modules`) |
| Install on server | `cd .../backend/apps/backend && bun install --ignore-scripts` |
| Migrations | `bunx dbmate -d db/migrations up` |
| Restart API | `pm2 restart ganatri-backend` |
| API logs | `pm2 logs ganatri-backend` |
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

rsync -avz --progress apps/web/dist/ root@216.158.228.89:/var/www/ganatri.loomsnack.com/frontend/
rsync -avz --delete --progress --exclude=node_modules out/ root@216.158.228.89:/var/www/ganatri.loomsnack.com/backend/
```

**Server:**

```bash
ssh root@216.158.228.89
cd /var/www/ganatri.loomsnack.com/backend/apps/backend && bun install --ignore-scripts
cd /var/www/ganatri.loomsnack.com/backend && pm2 restart ganatri-backend
```
