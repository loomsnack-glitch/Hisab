import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
    LoginSchema,
    RegisterSchema,
    STATUS_CODES,
    type ServiceConfig,
} from "@repo/types";
import { handleError, handleServiceResponse } from "@/helpers/service.helper";
import { validateSchema } from "@/middlewares/validate";
import * as authService from "./auth.service";

const FILE_NAME = "auth.routes";

const router = new Hono<{ Variables: ServiceConfig }>();

const setAuthCookie = (c: Parameters<typeof setCookie>[0], token: string) => {
    setCookie(c, "token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "lax",
        maxAge: 60 * 60 * 24 * 30,
    });
};

router.get("/", async (c) => {
    try {
        const token = getCookie(c, "token") || c.req.header("Authorization");
        if (!token) {
            return c.json(
                {
                    status: "error",
                    message: "Token is required",
                    code: STATUS_CODES.UNAUTHORIZED,
                },
                STATUS_CODES.UNAUTHORIZED,
            );
        }

        const serviceResponse = await authService.userAuthenticate(token);
        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "userAuthenticate", c, error);
    }
});

router.post("/register", validateSchema("json", RegisterSchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const deviceId = c.get("deviceId");
        const serviceResponse = await authService.register(body, { deviceId });

        if (serviceResponse.data?.token) {
            setAuthCookie(c, serviceResponse.data.token);
        }

        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "register", c, error);
    }
});

router.post("/login", validateSchema("json", LoginSchema), async (c) => {
    try {
        const body = c.req.valid("json");
        const deviceId = c.get("deviceId");
        const serviceResponse = await authService.userLogin(body, { deviceId });

        if (serviceResponse.data?.token) {
            setAuthCookie(c, serviceResponse.data.token);
        }

        return handleServiceResponse(c, serviceResponse);
    } catch (error) {
        return handleError(FILE_NAME, "userLogin", c, error);
    }
});

router.post("/logout", async (c) => {
    try {
        deleteCookie(c, "token");
        return handleServiceResponse(c, {
            status: "success",
            message: "Logout successful",
            code: STATUS_CODES.SUCCESS,
        });
    } catch (error) {
        return handleError(FILE_NAME, "userLogout", c, error);
    }
});

export default router;
