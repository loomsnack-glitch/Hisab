import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { deviceMiddleware } from "@/middlewares/device.middleware";

const deviceIdFromSetCookie = (header: string | null) => {
    const match = header?.match(/(?:^|, )deviceId=([^;]+)/);
    return match?.[1];
};

const appWithDeviceCookie = () => {
    const app = new Hono();
    app.use("*", deviceMiddleware);
    app.get("/api/auth/session", (c) => c.json({ deviceId: c.get("deviceId") }));
    app.get("/api/organizations", (c) => c.json({ deviceId: c.get("deviceId") }));
    return app;
};

describe("deviceId cookie", () => {
    test("sets a host-only cookie on Path=/ so localhost and LAN hosts both reuse it across API routes", async () => {
        const app = appWithDeviceCookie();

        const first = await app.request("http://localhost:5173/api/auth/session");
        const setCookie = first.headers.get("set-cookie");

        expect(setCookie).toContain("Path=/");
        expect(setCookie).not.toMatch(/Domain=/i);

        const deviceId = deviceIdFromSetCookie(setCookie);
        expect(deviceId).toBeTruthy();

        const second = await app.request("http://localhost:5173/api/organizations", {
            headers: { Cookie: `deviceId=${deviceId}` },
        });

        expect(second.headers.get("set-cookie")).toBeNull();
        expect(await second.json()).toEqual({ deviceId });
    });
});
