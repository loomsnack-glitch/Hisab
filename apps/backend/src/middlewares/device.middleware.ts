import type { Context } from "hono";
import { getDeviceId, setDeviceId } from "@/helpers/deviceId.helper";

export const deviceMiddleware = async (c: Context, next: () => Promise<void>) => {
    const pathname = new URL(c.req.url).pathname.replace(/\/+$/, "");
    if (pathname.endsWith("/webhooks/whatsapp")) {
        await next();
        return;
    }

    const existingDeviceId = getDeviceId(c);

    if (!existingDeviceId) {

        const newDeviceId = setDeviceId(c);

        // Also store it in context for downstream handlers
        c.set('deviceId', newDeviceId)
    } else {
        c.set('deviceId', existingDeviceId)
    }

    await next()
}
