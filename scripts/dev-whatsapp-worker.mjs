import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerDirectory = resolve(repositoryRoot, "apps/whatsapp-worker");
const buildArguments = [
    "build",
    "src/index.ts",
    "--outdir",
    "dist",
    "--target",
    "node",
    "--format",
    "esm",
    "--minify",
    "--external",
    "link-preview-js",
    "--external",
    "jimp",
    "--external",
    "sharp",
];

const initialBuild = spawnSync("bun", buildArguments, {
    cwd: workerDirectory,
    stdio: "inherit",
});

if (initialBuild.status !== 0) {
    process.exit(initialBuild.status ?? 1);
}

const builder = spawn("bun", [...buildArguments, "--watch"], {
    cwd: workerDirectory,
    stdio: "inherit",
});
const worker = spawn(process.execPath, ["--env-file=.env", "--watch", "dist/index.js"], {
    cwd: workerDirectory,
    stdio: "inherit",
});

let shuttingDown = false;
const shutdown = (code = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;
    builder.kill("SIGTERM");
    worker.kill("SIGTERM");
    process.exit(code);
};

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
builder.on("error", () => shutdown(1));
worker.on("error", () => shutdown(1));
worker.on("exit", (code, signal) => {
    if (!shuttingDown) {
        shutdown(code ?? (signal ? 1 : 0));
    }
});
