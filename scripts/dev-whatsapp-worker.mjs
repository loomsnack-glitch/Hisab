import { spawn, spawnSync } from "node:child_process";
import { open, readFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerDirectory = resolve(repositoryRoot, "apps/whatsapp-worker");
const lockPath = resolve(tmpdir(), "ganatri-whatsapp-worker-dev.lock");
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

const acquireLock = async () => {
    try {
        const handle = await open(lockPath, "wx");
        await handle.writeFile(String(process.pid), "utf8");
        await handle.close();
        return async () => { await unlink(lockPath).catch(() => undefined); };
    } catch (error) {
        if (error?.code === "EEXIST") {
            const ownerPid = Number.parseInt(await readFile(lockPath, "utf8").catch(() => ""), 10);
            if (Number.isInteger(ownerPid) && ownerPid > 0) {
                try {
                    process.kill(ownerPid, 0);
                    throw new Error(`WhatsApp worker dev process is already running (pid ${ownerPid})`);
                } catch (probeError) {
                    if (probeError instanceof Error && probeError.message.startsWith("WhatsApp worker dev process")) throw probeError;
                }
            }
            await unlink(lockPath).catch(() => undefined);
            return acquireLock();
        }
        throw error;
    }
};

const releaseLock = await acquireLock();
const initialBuild = spawnSync("bun", buildArguments, {
    cwd: workerDirectory,
    stdio: "inherit",
});

if (initialBuild.status !== 0) {
    await releaseLock();
    process.exit(initialBuild.status ?? 1);
}

const builder = spawn("bun", [...buildArguments, "--watch"], {
    cwd: workerDirectory,
    stdio: "inherit",
    detached: true,
});
const worker = spawn(process.execPath, ["--env-file=.env", "--watch", "dist/index.js"], {
    cwd: workerDirectory,
    stdio: "inherit",
    detached: true,
});

let shuttingDown = false;
let shutdownPromise = null;

const waitForExit = (child, timeoutMs = 30_000) => {
    if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
    return new Promise(resolve => {
        const timeout = setTimeout(() => {
            try {
                process.kill(-child.pid, "SIGKILL");
            } catch {
                child.kill("SIGKILL");
            }
            resolve();
        }, timeoutMs);
        child.once("exit", () => {
            clearTimeout(timeout);
            resolve();
        });
    });
};

const stopChild = async child => {
    if (child.exitCode === null && child.signalCode === null) {
        try {
            process.kill(-child.pid, "SIGTERM");
        } catch {
            child.kill("SIGTERM");
        }
    }
    await waitForExit(child);
};

const shutdown = async (code = 0) => {
    if (shutdownPromise) return shutdownPromise;
    shuttingDown = true;
    shutdownPromise = (async () => {
        await stopChild(builder);
        await stopChild(worker);
        await releaseLock();
        process.exit(code);
    })();
    return shutdownPromise;
};

builder.on("error", () => { void shutdown(1); });
worker.on("error", () => { void shutdown(1); });
worker.on("exit", (code, signal) => {
    if (!shuttingDown) void shutdown(code ?? (signal ? 1 : 0));
});
process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
