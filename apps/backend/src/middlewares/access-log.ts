import type { Context, MiddlewareHandler } from "hono";

type PrintLine = (line: string) => void;

const HEARTBEATS: ReadonlyArray<{ method: string; pattern: RegExp }> = [
    { method: "GET", pattern: /\/internal\/whatsapp\/outbox\/next$/ },
    { method: "GET", pattern: /\/internal\/whatsapp\/operations\/metrics$/ },
    { method: "POST", pattern: /\/internal\/whatsapp\/accounts\/[^/]+\/status$/ },
];

const requestPath = (c: Context): string => {
    const url = new URL(c.req.url, "http://localhost");
    return url.pathname + url.search;
};

const isWorkerHeartbeat = (method: string, path: string): boolean => {
    const pathname = path.split("?")[0] ?? path;
    return HEARTBEATS.some((heartbeat) => heartbeat.method === method && heartbeat.pattern.test(pathname));
};

const elapsed = (start: number): string => {
    const ms = Date.now() - start;
    return ms < 1_000 ? `${ms}ms` : `${Math.round(ms / 100) / 10}s`;
};

export const accessLog = (print: PrintLine = (line) => console.log(line)): MiddlewareHandler => {
    return async (c, next) => {
        const method = c.req.method;
        const path = requestPath(c);
        const start = Date.now();
        const heartbeat = isWorkerHeartbeat(method, path);
        if (!heartbeat) {
            print(`<-- ${method} ${path}`);
        }
        await next();
        const status = c.res.status;
        if (heartbeat && status < 400) {
            return;
        }
        if (heartbeat) {
            print(`<-- ${method} ${path}`);
        }
        print(`--> ${method} ${path} ${status} ${elapsed(start)}`);
    };
};
