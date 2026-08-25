import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

export const getDeviceId = (c: Context) => {
    const fromCookie = getCookie(c, "deviceId");
    if (fromCookie) {
        return fromCookie;
    }

    const fromHeader = c.req.header("X-Device-Id")?.trim();
    if (fromHeader) {
        return fromHeader;
    }

    return undefined;
};

export const setDeviceId = (c: Context) => {
    const isProduction = process.env.NODE_ENV === 'production'
    const newDeviceId = crypto.randomUUID();

    setCookie(c, 'deviceId', newDeviceId, {
        path: '/',
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
        maxAge: 60 * 60 * 24 * 400 // 400 days
    });

    return newDeviceId;
}
