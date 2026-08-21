module.exports = {
  apps: [
    {
      name: "ganatri-in-backend",
      script: "bun",
      cwd: "/var/www/ganatri.in/backend/apps/backend",
      args: ["--env-file=.env", "dist/index.js"],
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: "8181",
      },
    },
  ],
};
