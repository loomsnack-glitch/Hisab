export const OTP_EXPIRATION_TIME = 300 as const;

export const REDIS_KEYS = {
    AUTH_REGISTER_OTP: (deviceId: string, phone: string) => `auth:register:${deviceId}:${phone}`,
    AUTH_LOGIN_OTP: (deviceId: string, phone: string) => `auth:login:${deviceId}:${phone}`,
} as const;
