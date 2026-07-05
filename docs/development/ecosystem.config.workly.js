module.exports = {
  apps: [
    {
      name: "workly-backend",
      script: ".venv/bin/uvicorn",
      cwd: "/var/www/workly.loomsnack.xyz/app",
      args: [
        "backend.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
      ],
      interpreter: "none",
      env: {
        WORKLY_WEB_CORS_ORIGINS: "https://workly.loomsnack.xyz",
        WORKLY_WEB_TIMEZONE: "Asia/Kolkata",
      },
    },
  ],
};
