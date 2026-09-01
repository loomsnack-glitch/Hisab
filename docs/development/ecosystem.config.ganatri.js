module.exports = {
  apps: [
    {
      name: "ganatri-backend",
      script: "bun",
      cwd: "/var/www/ganatri.loomsnack.com/backend/apps/backend",
      args: ["--env-file=.env", "dist/index.js"],
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: "8001",
      },
    },
  ],
};
