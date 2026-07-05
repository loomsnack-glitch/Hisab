# 🚀 LoomSnack Deployment Guide

This document contains the build-phase commands and working rsync commands
for deploying frontend and backend.

------------------------------------------------------------------------

## 1️⃣ Build Phase

Run these commands first from the root project folder:

``` bash
git fetch origin
git pull origin
cd turborepo
bun i
bun run build
bun turbo prune --scope=backend
cd out
bun i
cd apps/backend
bun run build
```

### Notes:

- `bun run build` builds all apps and packages, and the frontend deploys use those generated `dist` files.
- `bun turbo prune --scope=backend` creates the separate backend bundle inside the `out` folder.
- `bun run build` inside `out/apps/backend` creates the backend build that will be deployed in the next steps.

------------------------------------------------------------------------

## 2️⃣ Deploy tendersense-admin (Frontend Admin)

### 📂 Go to location:

``` bash
cd /mnt/c/Users/Memighty/Desktop/tender-sense/loomsnack.xyz/www.tendersense.com-web-26.3.2.3/turborepo/apps/tendersense-admin/dist
```

### 🚀 Run:

``` bash
rsync -avz --progress /mnt/c/Users/Memighty/Desktop/tender-sense/loomsnack.xyz/www.tendersense.com-web-26.3.2.3/turborepo/apps/tendersense-admin/dist/ root@153.75.224.133:/var/www/loomsnack.xyz/admin/
```

------------------------------------------------------------------------

## 3️⃣ Deploy tendersense (Frontend Main)

### 📂 Go to location:

``` bash
cd /mnt/c/Users/Memighty/Desktop/tender-sense/loomsnack.xyz/www.tendersense.com-web-26.3.2.3/turborepo/apps/tendersense/dist
```

### 🚀 Run:

``` bash
rsync -avz --progress /mnt/c/Users/Memighty/Desktop/tender-sense/loomsnack.xyz/www.tendersense.com-web-26.3.2.3/turborepo/apps/tendersense/dist/ root@153.75.224.133:/var/www/loomsnack.xyz/frontend/
```

------------------------------------------------------------------------

## 4️⃣ Deploy Backend (Pruned, Without node_modules)

### 📂 Go to location:

``` bash
cd /mnt/c/Users/Memighty/Desktop/tender-sense/loomsnack.xyz/www.tendersense.com-web-26.3.2.3/turborepo/out
```

### 🚀 Run:

``` bash
rsync -avz --delete --progress --exclude=node_modules ./ root@153.75.224.133:/var/www/loomsnack.xyz/backend/
```

------------------------------------------------------------------------

## 5️⃣ After Backend Upload (On Server)

### 🔐 SSH into server:

``` bash
ssh root@153.75.224.133
cd /var/www/loomsnack.xyz/backend/apps/backend
```

### 📦 Install dependencies:

If using Bun:

``` bash
bun install
```

### 🔄 Restart PM2:

``` bash
cp ecosystem.config.js ecosystem.config.cjs
pm2 restart ecosystem.config.cjs
```

------------------------------------------------------------------------

# ✅ Deployment Complete
