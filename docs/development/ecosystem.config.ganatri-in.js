const fs = require("fs");
const path = require("path");

const parseEnvFile = (filePath) => {
  const env = {};
  if (!fs.existsSync(filePath)) {
    console.warn("[ganatri.in] missing env file: " + filePath);
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

const googleContactsWorkerDirectory =
  "/var/www/ganatri.in/backend/apps/google-contacts-worker";
const googleContactsWorkerEnv = parseEnvFile(
  path.join(googleContactsWorkerDirectory, ".env"),
);

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
    {
      name: "ganatri-in-google-contacts-worker",
      script: "bun",
      cwd: googleContactsWorkerDirectory,
      args: ["--env-file=.env", "src/index.ts"],
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        ...googleContactsWorkerEnv,
      },
    },
  ],
};
