import type { Context } from "hono";
import { STATUS_CODES, type ServiceResponse, type StatusCode } from "@repo/types";

export const handleError = (fileName: string, functionName: string, c: Context, error: any, message?: string, code?: StatusCode) => {
    console.log(`Error in ${fileName} at ${functionName}: ${error}`);
    c.status(STATUS_CODES.INTERNAL_SERVER_ERROR);
    return c.json({
        status: 'error',
        message: message || error?.message || 'Something went wrong',
        error,
        code: code || STATUS_CODES.INTERNAL_SERVER_ERROR,
    });
}

export const handleServiceResponse = <T>(c: Context, response: ServiceResponse<T>) => {
    c.status(response.code);
    return c.json(response);
}