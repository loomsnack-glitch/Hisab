import type { Context } from "hono";
import { getDeviceId, setDeviceId } from "@/helpers/deviceId.helper";

export const deviceMiddleware = async (c: Context, next: () => Promise<void>) => {
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