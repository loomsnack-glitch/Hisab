import { zValidator } from "@hono/zod-validator";
import type { Context, ValidationTargets } from "hono";
import { STATUS_CODES } from "@repo/types";

export const validateSchema = <
    Target extends keyof ValidationTargets,
    T extends Parameters<typeof zValidator>[1]
>(
    target: Target,
    schema: T
) => {
    return zValidator(target, schema, (result, c: Context) => {
        if (!result.success) {
            return c.json(
                {
                    status: "error",
                    message: "Validation error",
                    code: STATUS_CODES.BAD_REQUEST,
                    errors: result.error.issues,
                },
                STATUS_CODES.BAD_REQUEST
            );
        }

        c.set("valid" as any, result.data);
    });
};
