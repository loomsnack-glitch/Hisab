import type { FieldErrors, FieldValues, Resolver } from "react-hook-form";

type ZodLikeSchema<T> = {
    safeParse: (values: unknown) => {
        success: boolean;
        data?: T;
        error?: {
            issues: Array<{
                path: PropertyKey[];
                code: string;
                message: string;
            }>;
        };
    };
};

export const createZodResolver = <T extends FieldValues>(schema: ZodLikeSchema<T>): Resolver<T> => {
    return (values) => {
        const result = schema.safeParse(values);

        if (result.success && result.data) {
            return {
                values: result.data,
                errors: {},
            };
        }

        const errors = (result.error?.issues ?? []).reduce<FieldErrors<T>>((accumulator, issue) => {
            const path = issue.path.map(String).join(".");

            if (!path || accumulator[path as keyof T]) {
                return accumulator;
            }

            accumulator[path as keyof T] = {
                type: issue.code,
                message: issue.message,
            } as FieldErrors<T>[keyof T];

            return accumulator;
        }, {});

        return {
            values: {},
            errors,
        };
    };
};
