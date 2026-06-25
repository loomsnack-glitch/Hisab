import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { verify } from "hono/jwt";
import { STATUS_CODES, type AuthenticatedUserDTO } from "@repo/types";
import * as userRepository from "@/modules/access-control/user/user.repository";

const extractToken = (token: string) => token.replace(/^Bearer\s+/i, "").trim();

const sanitizeUser = (user: Awaited<ReturnType<typeof userRepository.getUserById>>): AuthenticatedUserDTO | null => {
    if (!user) {
        return null;
    }

    const { passwordHash, ...authenticatedUser } = user;
    return authenticatedUser;
};

export const authMiddleware = async (c: Context, next: Next) => {
    try {
        const token = getCookie(c, "token") || c.req.header("Authorization");
        if (!token) {
            return c.json(
                {
                    status: "error",
                    message: "Authentication is required",
                    code: STATUS_CODES.UNAUTHORIZED,
                },
                STATUS_CODES.UNAUTHORIZED,
            );
        }

        const decoded = await verify(extractToken(token), process.env.JWT_SECRET as string, "HS256");
        if (!decoded?.id || typeof decoded.id !== "string") {
            return c.json(
                {
                    status: "error",
                    message: "Invalid token",
                    code: STATUS_CODES.UNAUTHORIZED,
                },
                STATUS_CODES.UNAUTHORIZED,
            );
        }

        const user = sanitizeUser(await userRepository.getUserById(decoded.id));
        if (!user) {
            return c.json(
                {
                    status: "error",
                    message: "User not found",
                    code: STATUS_CODES.NOT_FOUND,
                },
                STATUS_CODES.NOT_FOUND,
            );
        }

        c.set("authUser", user);
        await next();
    } catch {
        return c.json(
            {
                status: "error",
                message: "Invalid token",
                code: STATUS_CODES.UNAUTHORIZED,
            },
            STATUS_CODES.UNAUTHORIZED,
        );
    }
};
