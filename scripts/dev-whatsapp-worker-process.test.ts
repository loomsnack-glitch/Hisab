import { describe, expect, test } from "bun:test";
import { createDevChildSpawnOptions } from "./dev-whatsapp-worker-process.mjs";

describe("WhatsApp worker dev child processes", () => {
    test("Windows keeps stdio inherited and does not detach from the console", () => {
        expect(createDevChildSpawnOptions("win32")).toEqual({
            stdio: "inherit",
            detached: false,
        });
    });

    test("Unix detaches into a process group so the wrapper can stop the tree", () => {
        expect(createDevChildSpawnOptions("linux")).toEqual({
            stdio: "inherit",
            detached: true,
        });
    });
});
