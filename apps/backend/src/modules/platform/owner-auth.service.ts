import {
    STATUS_CODES,
    type OwnerAuthResponse,
    type OwnerLoginSVC,
    type OwnerUserDTO,
    type OwnerUserRecord,
    type ServiceResponse,
} from "@repo/types";
import { sign, verify } from "hono/jwt";
import { redis } from "@/config/redis";
import { sendWhatsAppOTP } from "@/services/notifications/whatsapp.service";
import { OTP_EXPIRATION_TIME } from "@/utils/constant";
import { getRandomOTP } from "@/utils/helper";
import * as ownerUserRepository from "./owner-user.repository";

const OWNER_TOKEN_TYPE = "owner";
const OWNER_TOKEN_AUDIENCE = "platform-admin";
export const OWNER_SESSION_SECONDS = 60 * 60 * 24 * 30;
const DUMMY_PASSWORD_HASH = "$2b$10$E6kLoVWPJo5RY6Eb6xliBeynK4VuP5Fmk7gb2u5xnJHgHUTA8jqoC";

const extractToken = (token: string) => token.replace(/^Bearer\s+/i, "").trim();
const ownerOtpKey = (deviceId: string, phone: string) => `platform:owner-auth:login:${deviceId}:${phone}`;

const sanitizeOwnerUser = ({ passwordHash: _passwordHash, ...ownerUser }: OwnerUserRecord): OwnerUserDTO => ownerUser;

export type OwnerTokenProvider = {
    sign: (ownerUserId: string) => Promise<string>;
    verify: (token: string) => Promise<string | null>;
};

export const createOwnerTokenProvider = (secret: string): OwnerTokenProvider => ({
    sign: async (ownerUserId) => {
        const exp = Math.floor(Date.now() / 1000) + OWNER_SESSION_SECONDS;
        return sign(
            {
                ownerUserId,
                tokenType: OWNER_TOKEN_TYPE,
                audience: OWNER_TOKEN_AUDIENCE,
                exp,
            },
            secret,
        );
    },
    verify: async (token) => {
        try {
            const decoded = await verify(extractToken(token), secret, "HS256");
            if (
                decoded.ownerUserId === undefined
                || typeof decoded.ownerUserId !== "string"
                || decoded.tokenType !== OWNER_TOKEN_TYPE
                || decoded.audience !== OWNER_TOKEN_AUDIENCE
            ) {
                return null;
            }
            return decoded.ownerUserId;
        } catch {
            return null;
        }
    },
});

type OwnerAuthRepository = Pick<typeof ownerUserRepository, "getOwnerUserById" | "getOwnerUserByPhone">;

type OwnerOtpStore = {
    set: (key: string, value: string, ttlSeconds: number) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
};

type OwnerAuthDependencies = {
    repository: OwnerAuthRepository;
    otpStore: OwnerOtpStore;
    sendOtp: (input: { loginId: string; otp: string }) => Promise<{ ok: boolean; message?: string }>;
    createOtp: () => string;
    verifyPassword: (password: string, hash: string) => Promise<boolean>;
    tokenProvider: OwnerTokenProvider;
};

export type OwnerAuthService = ReturnType<typeof createOwnerAuthService>;

const denied = (): ServiceResponse<OwnerAuthResponse | null> => ({
    status: "error",
    message: "Invalid credentials",
    data: null,
    code: STATUS_CODES.UNAUTHORIZED,
});

export const createOwnerAuthService = (dependencies: OwnerAuthDependencies) => ({
    login: async (
        loginData: OwnerLoginSVC,
        serviceConfig: { deviceId: string },
    ): Promise<ServiceResponse<OwnerAuthResponse | null>> => {
        const ownerUser = await dependencies.repository.getOwnerUserByPhone(loginData.phone);

        if (loginData.requestType === "user-info") {
            const passwordMatches = await dependencies.verifyPassword(
                loginData.password,
                ownerUser?.passwordHash ?? DUMMY_PASSWORD_HASH,
            );
            if (!ownerUser?.isActive || !passwordMatches) {
                return denied();
            }
        }

        if (loginData.requestType === "otp-info") {
            if (ownerUser?.isActive) {
                const otp = dependencies.createOtp();
                const key = ownerOtpKey(serviceConfig.deviceId, loginData.phone);
                void (async () => {
                    await dependencies.otpStore.set(key, otp, OTP_EXPIRATION_TIME);
                    const delivery = await dependencies.sendOtp({ loginId: loginData.phone, otp });
                    if (!delivery.ok) {
                        await dependencies.otpStore.delete(key);
                    }
                })().catch(async () => {
                    try {
                        await dependencies.otpStore.delete(key);
                    } catch {
                        // Keep background OTP failures out of the credential response.
                    }
                });
            }

            return {
                status: "success",
                data: { nextRequestType: "otp-verification" },
                message: "If the Owner User is active, an OTP has been sent",
                code: STATUS_CODES.SUCCESS,
            };
        }

        if (loginData.requestType === "otp-verification") {
            const key = ownerOtpKey(serviceConfig.deviceId, loginData.phone);
            const actualOtp = await dependencies.otpStore.get(key);
            if (actualOtp === loginData.otp) {
                await dependencies.otpStore.delete(key);
            }
            if (!ownerUser?.isActive || actualOtp !== loginData.otp) {
                return denied();
            }
        }

        if (!ownerUser?.isActive) {
            return denied();
        }

        return {
            status: "success",
            data: {
                ownerUser: sanitizeOwnerUser(ownerUser),
                token: await dependencies.tokenProvider.sign(ownerUser.id),
            },
            message: "Login successful",
            code: STATUS_CODES.SUCCESS,
        };
    },

    authenticate: async (token: string): Promise<ServiceResponse<OwnerAuthResponse | null>> => {
        const ownerUserId = await dependencies.tokenProvider.verify(token);
        if (!ownerUserId) {
            return {
                status: "error",
                message: "Invalid or expired owner session",
                data: null,
                code: STATUS_CODES.UNAUTHORIZED,
            };
        }

        const ownerUser = await dependencies.repository.getOwnerUserById(ownerUserId);
        if (!ownerUser?.isActive) {
            return {
                status: "error",
                message: "Owner session is no longer active",
                data: null,
                code: STATUS_CODES.UNAUTHORIZED,
            };
        }

        return {
            status: "success",
            data: { ownerUser: sanitizeOwnerUser(ownerUser), token: extractToken(token) },
            message: "Owner authenticated successfully",
            code: STATUS_CODES.SUCCESS,
        };
    },
});

const requireOwnerSecret = () => {
    const secret = process.env.OWNER_JWT_SECRET?.trim();
    if (!secret) {
        throw new Error("OWNER_JWT_SECRET is required for Platform Owner authentication");
    }
    return secret;
};

const defaultDependencies = (): OwnerAuthDependencies => ({
    repository: ownerUserRepository,
    otpStore: {
        set: async (key, value, ttlSeconds) => {
            await redis.set(key, value);
            await redis.expire(key, ttlSeconds);
        },
        get: async (key) => (await redis.get(key))?.toString() ?? null,
        delete: async (key) => {
            await redis.del(key);
        },
    },
    sendOtp: async (input) => {
        const response = await sendWhatsAppOTP(input);
        return response.status === "success" ? { ok: true } : { ok: false, message: response.message };
    },
    createOtp: getRandomOTP,
    verifyPassword: Bun.password.verify,
    tokenProvider: {
        sign: async (ownerUserId) => createOwnerTokenProvider(requireOwnerSecret()).sign(ownerUserId),
        verify: async (token) => createOwnerTokenProvider(requireOwnerSecret()).verify(token),
    },
});

let defaultService: OwnerAuthService | null = null;

export const getOwnerAuthService = (): OwnerAuthService => {
    defaultService ??= createOwnerAuthService(defaultDependencies());
    return defaultService;
};
