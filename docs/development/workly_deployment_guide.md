# Workly Deployment Guide

Deploy **workly.loomsnack.xyz** on the same Ubuntu VPS as loomsnack.xyz.

| Piece | Stack | Server path |
|-------|-------|-------------|
| Frontend | React static build (Vite) | `/var/www/workly.loomsnack.xyz/frontend/` |
| Backend | FastAPI + uvicorn (PM2) | `/var/www/workly.loomsnack.xyz/app/` |
| Reverse proxy | nginx | `/api/` → `localhost:8000` |

TenderSense on loomsnack.xyz uses port **8080**. Workly uses port **8000** so they do not conflict.

---

## 0. One-time server setup (SSH)

```bash
ssh root@153.75.224.133

mkdir -p /var/www/workly.loomsnack.xyz/frontend
mkdir -p /var/www/workly.loomsnack.xyz/app
```

### DNS

Add an **A record** for `workly.loomsnack.xyz` pointing to `153.75.224.133`.

### nginx + SSL

Copy `workly.loomsnack.xyz` from this repo to the server, then:

```bash
# Option A: separate site file (recommended)
nano /etc/nginx/sites-available/workly.loomsnack.xyz
# paste contents from workly.loomsnack.xyz in this repo

ln -s /etc/nginx/sites-available/workly.loomsnack.xyz /etc/nginx/sites-enabled/

# Option B: append the workly server blocks into /etc/nginx/sites-enabled/loomsnack.xyz

nginx -t
systemctl reload nginx

# First-time certificate (HTTP must reach the server on port 80)
certbot --nginx -d workly.loomsnack.xyz
nginx -t && systemctl reload nginx
```

### Python venv on server (first time only)

```bash
cd /var/www/workly.loomsnack.xyz/app
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

### PM2 (first time only)

Start uvicorn directly (most reliable on this server). The ecosystem file name `ecosystem.config.workly.cjs` is **not** picked up as an ecosystem file by PM2 here — it runs the file as a script instead.

```bash
cd /var/www/workly.loomsnack.xyz/app

# Optional: confirm uvicorn works before PM2 (Ctrl+C to stop)
.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000

pm2 start .venv/bin/uvicorn \
  --name workly-backend \
  --interpreter none \
  --cwd /var/www/workly.loomsnack.xyz/app \
  -- \
  backend.main:app --host 127.0.0.1 --port 8000

pm2 save
```

`pm2 list` must show **`workly-backend`**. If you see `ecosystem.config.workly`, delete it: `pm2 delete ecosystem.config.workly`.

---

## 1. Build phase (local machine)

From the project root (`workly/`):

```bash
git fetch origin
git pull origin

cd frontend
npm install
npm run build
cd ..
```

Build output is `frontend/dist/`.

---

## 2. Deploy frontend

### Windows (WSL)

```bash
rsync -avz --progress \
  /mnt/c/Users/smarty/Desktop/loomsnack/workly/frontend/dist/ \
  root@153.75.224.133:/var/www/workly.loomsnack.xyz/frontend/
```

### PowerShell (if rsync is installed)

```powershell
rsync -avz --progress `
  "C:/Users/smarty/Desktop/loomsnack/workly/frontend/dist/" `
  root@153.75.224.133:/var/www/workly.loomsnack.xyz/frontend/
```

---

## 3. Deploy backend (Python app)

Sync the repo root **without** local venv, caches, or frontend build tooling.

```bash
rsync -avz --delete --progress \
  --exclude=.venv \
  --exclude=venv \
  --exclude=__pycache__ \
  --exclude=.git \
  --exclude=frontend/node_modules \
  --exclude=frontend/dist \
  --exclude="*.db" \
  --exclude=.env \
  --exclude=.env.* \
  /mnt/c/Users/smarty/Desktop/loomsnack/workly/ \
  root@153.75.224.133:/var/www/workly.loomsnack.xyz/app/
```

`--exclude="*.db"` keeps server-side SQLite files (sessions, linked accounts, bot settings) when you redeploy.

---

## 4. After upload (on server)

```bash
ssh root@153.75.224.133
cd /var/www/workly.loomsnack.xyz/app

source .venv/bin/activate
pip install -r requirements.txt
deactivate

pm2 restart workly-backend
pm2 logs workly-backend --lines 50
```

Health check:

```bash
curl -s http://127.0.0.1:8000/api/health
```

Then open `https://workly.loomsnack.xyz` in the browser.

---

## 5. Environment variables (optional)

Create `/var/www/workly.loomsnack.xyz/app/.env` on the server (never commit it):

```bash
WORKLY_WEB_CORS_ORIGINS=https://workly.loomsnack.xyz
WORKLY_WEB_TIMEZONE=Asia/Kolkata
WORKLY_WEB_LINKED_ACCOUNTS_DB_PATH=/var/www/workly.loomsnack.xyz/app/web_linked_accounts.db
```

PM2 does not load `.env` automatically for uvicorn. Either export vars in `ecosystem.config.workly.js` under `env`, or install `python-dotenv` and load it in the app later.

For same-origin nginx (`/` + `/api/` on one domain), CORS is optional in production.

---

## 6. Optional: Discord / Telegram bots on the server

The web app only needs `workly-backend`. Bots are separate long-running processes.

If you also run bots on the VPS, add more PM2 entries (examples):

```javascript
{
  name: "workly-discord-bot",
  script: ".venv/bin/python",
  cwd: "/var/www/workly.loomsnack.xyz/app",
  args: ["discord_bot.py"],
  interpreter: "none",
  env: { DISCORD_BOT_TOKEN: "..." }
}
```

Use the same `app/` folder and `.venv` as the API.

---

## Quick reference

| Task | Command |
|------|---------|
| Build frontend | `cd frontend && npm run build` |
| Sync frontend | rsync `frontend/dist/` → `.../frontend/` |
| Sync backend | rsync project root → `.../app/` (with excludes) |
| Restart API | `pm2 restart workly-backend` |
| API logs | `pm2 logs workly-backend` |
| nginx test | `nginx -t && systemctl reload nginx` |

---

## Troubleshooting

**502 on `/api/*`** — backend not running or wrong port:

```bash
pm2 status workly-backend
curl http://127.0.0.1:8000/api/health
```

If `pm2 list` shows **`ecosystem.config.workly`** instead of **`workly-backend`**, delete it and start uvicorn directly:

```bash
pm2 delete ecosystem.config.workly
cd /var/www/workly.loomsnack.xyz/app
pm2 start .venv/bin/uvicorn \
  --name workly-backend \
  --interpreter none \
  --cwd /var/www/workly.loomsnack.xyz/app \
  -- \
  backend.main:app --host 127.0.0.1 --port 8000
pm2 save
```

**Login works locally but not on domain** — check browser cookies for `workly_session` on `workly.loomsnack.xyz`. nginx must pass `Host` and cookies through the proxy (see `workly.loomsnack.xyz` config).

**Frontend 404 on refresh** — nginx needs `try_files $uri /index.html` for React Router (already in the config file).

**Certbot fails** — confirm DNS A record and that port 80 is open before running `certbot --nginx`.
