import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { workerConfig } from "./config.js";
import { logger } from "./logger.js";
import {
    BaileysAccountManager,
    type AccountConnectionInput,
} from "./provider/baileys-account-manager.js";

const json = (response: ServerResponse, status: number, body: unknown): void => {
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(body));
};

const authenticated = (request: IncomingMessage): boolean => {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";
    const expected = Buffer.from(workerConfig.workerToken);
    const actual = Buffer.from(token);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const readJson = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 32_768) {
            throw new Error("Request body too large");
        }
        chunks.push(buffer);
    }
    if (chunks.length === 0) return {};
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Request body must be an object");
    }
    return parsed as Record<string, unknown>;
};

const accountIdFromPath = (path: string): string | null => {
    const match = path.match(/^\/v1\/accounts\/([0-9a-f-]{36})(?:\/(connect|disconnect|status))?$/i);
    return match?.[1] ?? null;
};

export const createHttpServer = (manager: BaileysAccountManager) =>
    createServer(async (request, response) => {
        try {
            const method = request.method ?? "GET";
            const path = new URL(request.url ?? "/", "http://localhost").pathname;

            if (method === "GET" && path === "/health") {
                json(response, 200, { status: "ok" });
                return;
            }

            if (!authenticated(request)) {
                json(response, 401, { status: "error", message: "Unauthorized" });
                return;
            }

            const accountId = accountIdFromPath(path);
            if (!accountId) {
                json(response, 404, { status: "error", message: "Not found" });
                return;
            }

            if (method === "GET" && path.endsWith("/status")) {
                json(response, 200, manager.getStatus(accountId));
                return;
            }

            if (method === "POST" && path.endsWith("/connect")) {
                const body = await readJson(request);
                if (typeof body.phoneNumber !== "string" || !/^\+[1-9]\d{7,14}$/.test(body.phoneNumber)) {
                    json(response, 400, { status: "error", message: "Invalid phone number" });
                    return;
                }
                const result = await manager.connect({
                    accountId,
                    phoneNumber: body.phoneNumber,
                } satisfies AccountConnectionInput);
                json(response, 200, result);
                return;
            }

            if (method === "POST" && path.endsWith("/disconnect")) {
                json(response, 200, await manager.disconnect(accountId));
                return;
            }

            json(response, 404, { status: "error", message: "Not found" });
        } catch {
            json(response, 500, { status: "error", message: "Worker request failed" });
        }
    });

export const startHttpServer = (manager: BaileysAccountManager) => {
    const server = createHttpServer(manager);
    server.listen(workerConfig.port, workerConfig.host, () => {
        logger.info("WhatsApp worker listening", { port: workerConfig.port });
    });
    return server;
};
