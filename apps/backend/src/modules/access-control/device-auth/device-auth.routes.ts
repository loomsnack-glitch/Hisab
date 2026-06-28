import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { DeviceLoginSchema, STATUS_CODES } from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { deviceAuthMiddleware } from "@/middlewares/device-auth.middleware";
import { validateSchema } from "@/middlewares/validate";
import type { AppVariables } from "@/types/hono";
import * as deviceAuthService from "./device-auth.service";

const FILE_NAME = "device-auth.routes";
const DEVICE_AUTH_COOKIE = "device_token";

const router = new Hono<{ Variables: AppVariables }>();

const setDeviceAuthCookie = (c: Parameters<typeof setCookie>[0], token: string) => {
    setCookie(c, DEVICE_AUTH_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "lax",
        maxAge: 60 * 60 * 24 * 30,
    });
};

router.get("/", deviceAuthMiddleware, async (c) => {
    try {
        const session = c.get("authDevice");
        return handleServiceResponse(c, {
            status: "success",
            data: { session },
            message: "Device authenticated successfully",
            code: STATUS_CODES.SUCCESS,
        });
    } catch (error) {
        return handleError(FILE_NAME, "authenticate", c, error);
    }
});

router.post("/login", validateSchema("json", DeviceLoginSchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const serviceResponse = await deviceAuthService.login(body);

        if (serviceResponse.data?.token) {
            setDeviceAuthCookie(c, serviceResponse.data.token);
        }

        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "login", c, error);
    }
});

router.post("/logout", async (c) => {
    try {
        const token = getCookie(c, DEVICE_AUTH_COOKIE) || c.req.header("Authorization");
        deleteCookie(c, DEVICE_AUTH_COOKIE);

        return handleServiceResponse(c, {
            status: "success",
            message: token ? "Device logout successful" : "Device session already cleared",
            data: null,
            code: STATUS_CODES.SUCCESS,
        });
    } catch (error) {
        return handleError(FILE_NAME, "logout", c, error);
    }
});

export default router;
