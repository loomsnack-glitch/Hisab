import { spawnSync } from "node:child_process";

export const createDevChildSpawnOptions = (platform = process.platform) => ({
    stdio: "inherit",
    detached: platform !== "win32",
});

export const stopDevChildTree = (child, signal, platform = process.platform) => {
    if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
    if (platform === "win32") {
        const args = signal === "SIGKILL"
            ? ["/F", "/T", "/PID", String(child.pid)]
            : ["/T", "/PID", String(child.pid)];
        spawnSync("taskkill", args, { stdio: "ignore", windowsHide: true });
        return;
    }
    try {
        process.kill(-child.pid, signal);
    } catch {
        child.kill(signal);
    }
};
