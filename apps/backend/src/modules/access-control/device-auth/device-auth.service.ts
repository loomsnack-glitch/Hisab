import { STATUS_CODES, type DeviceAuthResponse, type DeviceLoginSVC, type ServiceResponse } from "@repo/types";
import { sign, verify } from "hono/jwt";
import { timingSafeEqual } from "node:crypto";
import { decryptDeviceSecret } from "@/helpers/deviceSecret.helper";
import * as deviceAuthRepository from "./device-auth.repository";

const extractToken = (token: string) => token.replace(/^Bearer\s+/i, "").trim();

const compareSecrets = (inputSecret: string, actualSecret: string) => {
    const inputBuffer = Buffer.from(inputSecret.trim(), "utf8");
    const actualBuffer = Buffer.from(actualSecret, "utf8");

    if (inputBuffer.length !== actualBuffer.length) {
        return false;
    }

    return timingSafeEqual(inputBuffer, actualBuffer);
};

const buildToken = async (deviceId: string) => {
    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
    return sign({ deviceId, exp }, process.env.JWT_SECRET as string);
};

export const login = async (
    loginData: DeviceLoginSVC,
): Promise<ServiceResponse<DeviceAuthResponse | null>> => {
    const session = await deviceAuthRepository.getDeviceSessionById(loginData.deviceId);
    if (!session) {
        return {
            status: "error",
            message: "Invalid device credentials",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    if (session.device.status !== "active") {
        return {
            status: "error",
            message: "This device is not active",
            data: null,
            code: STATUS_CODES.FORBIDDEN,
        };
    }

    const encryptedSecret = await deviceAuthRepository.getDeviceSecretEncryptedById(loginData.deviceId);
    if (!encryptedSecret) {
        return {
            status: "error",
            message: "Invalid device credentials",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const actualSecret = await decryptDeviceSecret(encryptedSecret);
    if (!compareSecrets(loginData.deviceSecret, actualSecret)) {
        return {
            status: "error",
            message: "Invalid device credentials",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    return {
        status: "success",
        data: {
            session,
            token: await buildToken(session.device.id),
        },
        message: "Device login successful",
        code: STATUS_CODES.SUCCESS,
    };
};

export const authenticate = async (
    token: string,
): Promise<ServiceResponse<DeviceAuthResponse | null>> => {
    const decoded = await verify(extractToken(token), process.env.JWT_SECRET as string, "HS256");
    if (!decoded?.deviceId || typeof decoded.deviceId !== "string") {
        return {
            status: "error",
            message: "Invalid device token",
            code: STATUS_CODES.UNAUTHORIZED,
        };
    }

    const session = await deviceAuthRepository.getDeviceSessionById(decoded.deviceId);
    if (!session || session.device.status !== "active") {
        return {
            status: "error",
            message: "Device session is no longer active",
            code: STATUS_CODES.UNAUTHORIZED,
        };
    }

    return {
        status: "success",
        data: {
            session,
            token: extractToken(token),
        },
        message: "Device authenticated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const touchLastSeen = async (deviceId: string) => {
    await deviceAuthRepository.updateDeviceLastSeenAt(deviceId);
};
