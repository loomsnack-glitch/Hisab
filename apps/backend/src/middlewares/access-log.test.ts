import { describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { accessLog } from "./access-log";

const appWithLogs = () => {
    const lines: string[] = [];
    const app = new Hono();
    app.use("*", accessLog((line) => lines.push(line)));
    app.get("/api/internal/whatsapp/outbox/next", (c) => {
        if (c.req.query("fail") === "1") {
            return c.json({ message: "WhatsApp outbox claim failed" }, 500);
        }
        return c.json({ job: null });
    });
    app.get("/api/internal/whatsapp/operations/metrics", (c) => c.json({ metrics: {} }));
    app.post("/api/internal/whatsapp/accounts/:accountId/status", (c) => c.json({ status: "success" }));
    app.post("/api/internal/whatsapp/outbox/:outboxId/result", (c) => c.json({ status: "success" }));
    app.post("/api/pos/sales/:saleId/commit", (c) => c.json({ status: "success" }));
    return { app, lines };
};

describe("access log", () => {
    test("omits successful WhatsApp worker heartbeats so poll traffic stays out of the access log", async () => {
        const { app, lines } = appWithLogs();

        await app.request("/api/internal/whatsapp/outbox/next?partitionCount=1&partitionIndex=0");
        await app.request("/api/internal/whatsapp/operations/metrics?partitionCount=1&partitionIndex=0");
        await app.request("/api/internal/whatsapp/accounts/96095f81-550b-4cc7-9db0-458701b4d7b2/status", {
            method: "POST",
        });

        expect(lines).toEqual([]);
    });

    test("still logs worker heartbeat failures and normal application requests", async () => {
        const { app, lines } = appWithLogs();

        await app.request("/api/internal/whatsapp/outbox/next?fail=1");
        await app.request("/api/pos/sales/18b7ad9c-f94c-4b10-a06c-10c8a7ea25af/commit", { method: "POST" });
        await app.request("/api/internal/whatsapp/outbox/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/result", {
            method: "POST",
        });

        expect(lines.some((line) => line.includes("GET /api/internal/whatsapp/outbox/next?fail=1") && line.includes("500"))).toBe(true);
        expect(lines.some((line) => line.includes("POST /api/pos/sales/18b7ad9c-f94c-4b10-a06c-10c8a7ea25af/commit"))).toBe(true);
        expect(lines.some((line) => line.includes("POST /api/internal/whatsapp/outbox/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/result"))).toBe(true);
    });
});
