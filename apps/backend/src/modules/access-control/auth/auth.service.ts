import {
    STATUS_CODES,
    type AuthenticatedUserDTO,
    type BaseAuthResponse,
    type LoginAuthResponse,
    type LoginSVC,
    type RegisterAuthResponse,
    type RegisterSVC,
    type ServiceConfig,
    type ServiceResponse,
    type UserDTO,
} from "@repo/types";
import { sign, verify } from "hono/jwt";
import { redis } from "@/config/redis";
import * as userRepository from "@/modules/access-control/user/user.repository";
import { sendWhatsAppOTP } from "@/services/notifications/whatsapp.service";
import { OTP_EXPIRATION_TIME, REDIS_KEYS } from "@/utils/constant";
import { getRandomOTP } from "@/utils/helper";

const sanitizeUser = (user: UserDTO): AuthenticatedUserDTO => {
    const { passwordHash, ...authenticatedUser } = user;
    return authenticatedUser;
};

const normalizeEmail = (email?: string | null) => {
    const trimmed = email?.trim();
    return trimmed ? trimmed.toLowerCase() : null;
};

const extractToken = (token: string) => token.replace(/^Bearer\s+/i, "").trim();

export const register = async (
    registrationData: RegisterSVC,
    serviceConfig: Pick<ServiceConfig, "deviceId">,
): Promise<ServiceResponse<RegisterAuthResponse | null>> => {
    const normalizedEmail = normalizeEmail(registrationData.email);
    const existingPhoneUser = await userRepository.getUserByPhone(registrationData.phone);
    if (existingPhoneUser) {
        return {
            status: "error",
            message: "User with same phone number already registered",
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (normalizedEmail) {
        const existingEmailUser = await userRepository.getUserByEmail(normalizedEmail);
        if (existingEmailUser) {
            return {
                status: "error",
                message: "User with same email already registered",
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    if (
        registrationData.requestType === "user-info" ||
        (registrationData.requestType === "otp-verification" && registrationData.resendOTP === "phoneOTP")
    ) {
        const otp = getRandomOTP();
        const otpKey = REDIS_KEYS.AUTH_REGISTER_OTP(serviceConfig.deviceId, registrationData.phone);

        await redis.set(otpKey, otp);
        await redis.expire(otpKey, OTP_EXPIRATION_TIME);

        const notificationResponse = await sendWhatsAppOTP({ loginId: registrationData.phone, otp });
        if (notificationResponse.status === "error") {
            return {
                status: "error",
                message: notificationResponse.message,
                code: notificationResponse.code ?? STATUS_CODES.INTERNAL_SERVER_ERROR,
                data: null,
            };
        }

        return {
            status: "success",
            data: { nextRequestType: "otp-verification" },
            message: registrationData.requestType === "user-info" ? "OTP sent successfully" : "OTP resent successfully",
            code: STATUS_CODES.SUCCESS,
        };
    }

    const otpKey = REDIS_KEYS.AUTH_REGISTER_OTP(serviceConfig.deviceId, registrationData.phone);
    const actualOtp = await redis.get(otpKey);

    if (actualOtp?.toString() !== registrationData.otp) {
        return {
            status: "error",
            message: "Invalid OTP",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const passwordHash = await Bun.password.hash(registrationData.password);
    const user = await userRepository.createUser({
        id: crypto.randomUUID(),
        salutation: registrationData.salutation,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        phone: registrationData.phone,
        email: normalizedEmail,
        passwordHash,
    });

    if (!user) {
        return {
            status: "error",
            message: "Failed to create user",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    await redis.del(otpKey);

    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
    const token = await sign({ id: user.id, exp }, process.env.JWT_SECRET as string);

    return {
        status: "success",
        data: {
            user: sanitizeUser(user),
            token,
        },
        message: "Registered successfully",
        code: STATUS_CODES.CREATED,
    };
};

export const userLogin = async (
    loginData: LoginSVC,
    serviceConfig: Pick<ServiceConfig, "deviceId">,
): Promise<ServiceResponse<LoginAuthResponse | null>> => {
    const user = await userRepository.getUserByPhone(loginData.phone);
    if (!user) {
        return {
            status: "error",
            message: "Invalid credentials",
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    if (loginData.requestType === "user-info") {
        if (!user.passwordHash) {
            return {
                status: "error",
                message: "Password is not set for this account",
                code: STATUS_CODES.BAD_REQUEST,
            };
        }

        const isPasswordValid = await Bun.password.verify(loginData.password ?? "", user.passwordHash);
        if (!isPasswordValid) {
            return {
                status: "error",
                message: "Invalid credentials",
                code: STATUS_CODES.BAD_REQUEST,
            };
        }
    }

    if (loginData.requestType === "otp-info") {
        const otp = getRandomOTP();
        const otpKey = REDIS_KEYS.AUTH_LOGIN_OTP(serviceConfig.deviceId, loginData.phone);

        await redis.set(otpKey, otp);
        await redis.expire(otpKey, OTP_EXPIRATION_TIME);

        const notificationResponse = await sendWhatsAppOTP({ loginId: loginData.phone, otp });
        if (notificationResponse.status === "error") {
            return {
                status: "error",
                message: notificationResponse.message,
                code: notificationResponse.code ?? STATUS_CODES.INTERNAL_SERVER_ERROR,
                data: null,
            };
        }

        return {
            status: "success",
            data: { nextRequestType: "otp-verification" },
            message: "OTP sent successfully",
            code: STATUS_CODES.SUCCESS,
        };
    }

    if (loginData.requestType === "otp-verification") {
        const otpKey = REDIS_KEYS.AUTH_LOGIN_OTP(serviceConfig.deviceId, loginData.phone);
        const actualOtp = await redis.get(otpKey);

        if (actualOtp?.toString() !== loginData.otp) {
            return {
                status: "error",
                message: "Invalid OTP",
                code: STATUS_CODES.BAD_REQUEST,
            };
        }

        await redis.del(otpKey);
    }

    const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
    const token = await sign({ id: user.id, exp }, process.env.JWT_SECRET as string);

    return {
        status: "success",
        data: {
            user: sanitizeUser(user),
            token,
        },
        message: "Login successful",
        code: STATUS_CODES.SUCCESS,
    };
};

export const userAuthenticate = async (token: string): Promise<ServiceResponse<BaseAuthResponse | null>> => {
    const decoded = await verify(extractToken(token), process.env.JWT_SECRET as string, "HS256");
    if (!decoded?.id || typeof decoded.id !== "string") {
        return {
            status: "error",
            message: "Invalid token",
            code: STATUS_CODES.UNAUTHORIZED,
        };
    }

    const user = await userRepository.getUserById(decoded.id);
    if (!user) {
        return {
            status: "error",
            message: "User not found",
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return {
        status: "success",
        data: {
            user: sanitizeUser(user),
            token: extractToken(token),
        },
        message: "Authenticated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};
