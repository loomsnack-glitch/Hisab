import { type ServiceResponse, type OTPRequestData, type WhatsAppOTPResponseData, STATUS_CODES } from "@repo/types"
import axios from "axios";

export const sendWhatsAppOTP = async ({ loginId, otp }: OTPRequestData): Promise<ServiceResponse<WhatsAppOTPResponseData | string | null>> => {
    try {
        if (!loginId || !otp) {
            return { status: "error", message: "loginId or OTP is missing", data: null, code: STATUS_CODES.BAD_REQUEST };
        }
        console.log(`Sending WhatsApp OTP to ${loginId}: ${otp}`);

        if (process.env.NODE_ENV === "production") {
            const response = await axios({
                method: 'POST',
                url: process.env.WHATSAPP_API_URL,
                timeout: 10000,
                family: 4,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
                },
                data: {
                    "messaging_product": "whatsapp",
                    "to": loginId.split('+')[1],
                    "type": "template",
                    "template": {
                        "name": "verification_code",
                        "language": {
                            "code": "en"
                        },
                        "components": [
                            {
                                "type": "body",
                                "parameters": [
                                    {
                                        "type": "text",
                                        "text": otp
                                    }
                                ]
                            },
                            {
                                "type": "button",
                                "sub_type": "url",
                                "index": "0",
                                "parameters": [
                                    {
                                        "type": "text",
                                        "text": otp
                                    }
                                ]
                            }
                        ]
                    }
                }
            });
            console.log("WhatsApp OTP sent successfully", JSON.stringify(response.data, null, 2));

            return { status: "success", message: "OTP sent successfully", data: response.data, code: STATUS_CODES.SUCCESS };
        } else {
            console.log("WhatsApp OTP sent successfully", otp);
            return { status: "success", message: "OTP sent successfully", data: otp, code: STATUS_CODES.SUCCESS };
        }
    } catch (error) {
        console.log(`Failed to send OTP in whatsapp.service.ts : sendWhatsAppOTP`, error)
        return { status: "error", message: "Failed to send OTP in whatsapp.service.ts : sendWhatsAppOTP", data: null, code: STATUS_CODES.INTERNAL_SERVER_ERROR };
    }
};

/**
 * Send a WhatsApp organization invitation notification.
 * Uses approved WhatsApp template: "invite_organization_user"
 *
 * Body:
 * "Hello, {{1}} has invited you to join the organization "{{2}}" on BoxMap."
 *
 * Button:
 * CTA → Visit Website (Static)
 * Text: "View Invitation"
 */

export const sendWhatsAppOrgInvite = async ({
    mobile,
    orgName,
    inviterName,
}: {
    mobile: string;
    orgName: string;
    inviterName: string;
}): Promise<void> => {
    try {
        console.log({ mobile, orgName, inviterName });

        const formattedMobile = mobile.startsWith("+")
            ? mobile.substring(1)
            : mobile;

        if (process.env.NODE_ENV === "production") {
            await axios({
                method: "POST",
                url: process.env.WHATSAPP_API_URL,
                timeout: 10000,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
                },
                data: {
                    messaging_product: "whatsapp",
                    to: formattedMobile,
                    type: "template",
                    template: {
                        name: "invite_organization_user",
                        language: { code: "en" },
                        components: [
                            {
                                type: "body",
                                parameters: [
                                    { type: "text", text: inviterName },
                                    { type: "text", text: orgName },
                                ],
                            }
                        ],
                    },
                },
            });

            console.log(
                `WhatsApp org invite sent to ${mobile} for org "${orgName}"`
            );
        } else {
            console.log(
                `[DEV] WhatsApp org invite → ${mobile}: "${inviterName}" invited user to "${orgName}".`
            );
        }
    } catch (error: any) {
        console.error(
            "WhatsApp error response:",
            error?.response?.data || error
        );
    }
};