import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

export const getDeviceId = (c: Context) => {
    const existingDeviceId = getCookie(c, 'deviceId');
    return existingDeviceId;
}

export const setDeviceId = (c: Context) => {
    const isProduction = process.env.NODE_ENV === 'production'
    const newDeviceId = crypto.randomUUID();

    // Store deviceId in a cookie
    setCookie(c, 'deviceId', newDeviceId, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'None' : 'Lax',
        maxAge: 60 * 60 * 24 * 400 // 400 days
    });

    return newDeviceId;
}