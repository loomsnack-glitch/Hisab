const fs = require("fs");
const path = require("path");

const parseEnvFile = (filePath) => {
  const env = {};
  if (!fs.existsSync(filePath)) {
    console.warn("[ganatri] missing env file: " + filePath);
    return env;
  }

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
};

const workerDirectory = "/var/www/ganatri.loomsnack.com/backend/apps/whatsapp-worker";
const workerEnv = parseEnvFile(path.join(workerDirectory, ".env"));

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
    {
      name: "ganatri-whatsapp-worker",
      script: "dist/index.js",
      cwd: workerDirectory,
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        ...workerEnv,
      },
    },
  ],
};
