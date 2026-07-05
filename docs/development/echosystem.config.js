module.exports = {
    apps: [
      {
        name: "tendersense-backend",
        script: "bun",
        cwd: "/var/www/loomsnack.xyz/backend/apps/backend",
        args: ["--env-file=.env", "dist/index.js"],
        interpreter: "none",
        env: {
          NODE_ENV: "production",
          // Issue 6 (database-performance-audit): the API previously fell through to the
          // DB_POOL_MAX=20 default. With ~2 burstable vCPUs, 20 API + worker pools could
          // open ~50 connections against max_connections=80 and starve CPU/work_mem.
          // Cap at 8; scale out behind PgBouncer/RDS Proxy instead of growing pools.
          DB_POOL_MAX: "8"
        }
      },
      {
        name: "tendersense-scraper-worker",
        script: "bun",
        cwd: "/var/www/loomsnack.xyz/backend/apps/backend",
        args: ["--env-file=.env", "dist/workers/scraper-worker.js"],
        interpreter: "none",
        kill_timeout: 120000,
        env: {
          NODE_ENV: "production",
          DB_POOL_MAX: "3",
          DB_IDLE_TIMEOUT: "300",
          DB_MAX_LIFETIME: "1800"
        }
      },
      {
        name: "tendersense-scrape-history-worker",
        script: "bun",
        cwd: "/var/www/loomsnack.xyz/backend/apps/backend",
        args: ["--env-file=.env", "dist/workers/scrape-history-worker.js"],
        interpreter: "none",
        kill_timeout: 120000,
        env: {
          NODE_ENV: "production",
          DB_POOL_MAX: "3",
          DB_IDLE_TIMEOUT: "300",
          DB_MAX_LIFETIME: "1800",
          SCRAPE_HISTORY_WORKER_CONCURRENCY: "1"
        }
      },
      {
        name: "tendersense-watchlist-dashboard-worker",
        script: "bun",
        cwd: "/var/www/loomsnack.xyz/backend/apps/backend",
        args: ["--env-file=.env", "dist/workers/watchlist-dashboard-worker.js"],
        interpreter: "none",
        kill_timeout: 120000,
        env: {
          NODE_ENV: "production",
          // Concurrency 1 — cannot productively use more than ~2 connections.
          DB_POOL_MAX: "2",
          DB_IDLE_TIMEOUT: "300",
          DB_MAX_LIFETIME: "1800",
          WATCHLIST_DASHBOARD_WORKER_CONCURRENCY: "1"
        }
      },
      {
        name: "tendersense-notification-worker",
        script: "bun",
        cwd: "/var/www/loomsnack.xyz/backend/apps/backend",
        args: ["--env-file=.env", "dist/workers/notification-worker.js"],
        interpreter: "none",
        kill_timeout: 120000,
        env: {
          NODE_ENV: "production",
          // Concurrency 1 — cannot productively use more than ~2 connections.
          DB_POOL_MAX: "2",
          DB_IDLE_TIMEOUT: "300",
          DB_MAX_LIFETIME: "1800",
          NOTIFICATION_WORKER_CONCURRENCY: "1"
        }
      }
    ]
  };