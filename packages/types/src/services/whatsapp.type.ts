export type OTPRequestData = {
    loginId: string;
    otp: string;
};

export type WhatsAppOTPResponseData = {
    messaging_product: string;
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
    }>;
};
