// File: packages/types/src/backend/service-response.ts
import type { StatusCode } from "./status-code";

export type ErrorResponse = {
    message: string;
    [key: string]: unknown;
}

export interface ServiceResponse<T> {
    status: 'success' | 'error';
    data?: T;
    message: string;
    code: StatusCode;
    error?: ErrorResponse;
    errors?: ErrorResponse[];
}

export type ServiceConfig = {
    deviceId: string;
}