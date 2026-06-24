import { STATUS_CODES } from '@repo/types';
import nodemailer from 'nodemailer';

type BrandType = 'boxmap' | 'admin';

interface BrandConfig {
    name: string;
    url: string;
    logo: string;
    primaryColor: string;
    supportEmail: string;
}

const BRANDS: Record<BrandType, BrandConfig> = {
    boxmap: {
        name: 'BoxMap',
        url: 'https://boxmap.loomsnack.com',
        logo: 'https://boxmap.loomsnack.com/logo.png',
        primaryColor: '#c99147', // BoxMap Brown/Tan from logo
        supportEmail: 'loomsnack@gmail.com'
    },
    admin: {
        name: 'BoxMap Admin',
        url: 'https://admin.boxmap.loomsnack.com',
        logo: 'https://boxmap.loomsnack.com/logo.png',
        primaryColor: '#3b82f6', // Consistent Blue for Admin
        supportEmail: 'loomsnack@gmail.com'
    }
};

const FROM_EMAIL = 'loomsnack@gmail.com';

const getHtmlTemplate = (title: string, content: string, brandType: BrandType = 'boxmap') => {
    const brand = BRANDS[brandType];
    const isBoxmap = brandType === 'boxmap';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0; }
        .header { background-color: #ffffff; padding: 40px 32px; text-align: center; border-bottom: 1px solid #f1f5f9; }
        .brand-text { font-size: 28px; font-weight: 700; color: #1e293b; letter-spacing: -0.04em; display: inline-block; vertical-align: middle; }
        .brand-suffix { color: ${brand.primaryColor}; }
        .content { padding: 48px 40px; }
        .content h2 { color: #0f172a; margin-top: 0; font-size: 22px; font-weight: 700; margin-bottom: 24px; letter-spacing: -0.02em; }
        .content p { margin-bottom: 24px; color: #475569; font-size: 16px; }
        .otp-container { background-color: ${isBoxmap ? '#fff9f2' : '#f0f7ff'}; border: 2px dashed ${isBoxmap ? '#fde6d2' : '#cce3ff'}; border-radius: 16px; padding: 32px; text-align: center; margin: 32px 0; }
        .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 0.3em; color: ${brand.primaryColor}; font-family: 'Monaco', 'Consolas', monospace; }
        .button-container { text-align: center; margin: 32px 0; }
        .button { display: inline-block; background-color: ${brand.primaryColor}; color: #ffffff !important; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; }
        .footer { padding: 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 14px; color: #64748b; }
        .footer p { margin: 8px 0; }
        .accent { color: ${brand.primaryColor}; font-weight: 600; }
        .note { font-size: 14px; color: #94a3b8; margin-top: 32px; font-weight: 400; font-style: italic; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="display: inline-block; vertical-align: middle; margin-right: 12px;">
                <img src="${brand.logo}" alt="BoxMap" width="40" height="40" style="display: block; border-radius: 8px;">
            </div>
            <span class="brand-text">Box<span class="brand-suffix">Map</span>${!isBoxmap ? ' <span style="font-weight: 500; font-size: 24px; color: #64748b;">Admin</span>' : ''}</span>
        </div>
        <div class="content">
            <h2 style="text-align: center;">${title}</h2>
            ${content}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
            <p>${isBoxmap ? 'Streamlining your visual workspace.' : 'Internal Administration Portal'}</p>
            <p><a href="${brand.url}" style="color: ${brand.primaryColor}; text-decoration: none; font-weight: 500;">${brand.url.replace('https://', '')}</a></p>
        </div>
    </div>
</body>
</html>
`;
};

export const sendMail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });

    return await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
    });
};

const dispatchEmail = async (to: string, subject: string, html: string, text: string) => {
    if (process.env.NODE_ENV === 'production') {
        const response = await sendMail({ to, subject, html });
        console.log(`Email sent via Nodemailer (Dev) to ${to}: ${subject}`);
        return response;
    } else {
        const response = await sendMail({ to, subject, html });
        console.log(`Email sent via Nodemailer (Dev) to ${to}: ${subject}`);
        return response;
    }
};

export const sendLoginEmailOTP = async ({ email, otp, brand = 'boxmap' }: { email: string, otp: string, brand?: BrandType }) => {
    try {
        const config = BRANDS[brand];
        if (!email || !otp) {
            return { status: 'error', message: 'Email or OTP is missing', data: null, statusCode: STATUS_CODES.BAD_REQUEST };
        }

        console.log(`Preparing Login OTP for ${email} (${brand}): ${otp}`);

        const subject = `Your ${config.name} Login OTP`;
        const content = `
            <p>Hello,</p>
            <p>We received a request to log in to your <strong>${config.name}</strong> account. Please use the following One-Time Password (OTP) to proceed:</p>
            
            <div class="otp-container">
                <span class="otp-code">${otp}</span>
            </div>

            <p class="note"><strong>Note:</strong> This OTP will expire in 10 minutes. If you did not request this login, please secure your account.</p>
            
            <p>Best regards,<br />The ${config.name} Team</p>
        `;

        const html = getHtmlTemplate('Secure Login', content, brand);
        const bodyText = `Your ${config.name} login OTP is: ${otp}`;

        const response = await dispatchEmail(email, subject, html, bodyText);
        return { status: 'success', message: 'Login OTP email sent successfully', data: process.env.NODE_ENV === 'production' ? response : otp, statusCode: STATUS_CODES.SUCCESS };

    } catch (error) {
        console.error(`Failed to send login OTP email: ${error}`);
        return { status: 'error', message: 'Failed to send login OTP email', error };
    }
};

export const sendEmailVerificationOTP = async ({ email, otp, brand = 'boxmap' }: { email: string, otp: string, brand?: BrandType }) => {
    try {
        const config = BRANDS[brand];
        if (!email || !otp) {
            return { status: 'error', message: 'Email or OTP is missing', data: null, statusCode: STATUS_CODES.BAD_REQUEST };
        }

        console.log(`Preparing Email Verification OTP for ${email} (${brand}): ${otp}`);

        const subject = `Verify Your Email Address - ${config.name}`;
        const content = `
            <p>Hello,</p>
            <p>To ensure the security of your account and verify your email address on <strong>${config.name}</strong>, please use the following One-Time Password (OTP):</p>
            
            <div class="otp-container">
                <span class="otp-code">${otp}</span>
            </div>

            <p class="note"><strong>Note:</strong> This verification code will expire in 10 minutes. If you did not request this, please disregard this email.</p>
            
            <p>Best regards,<br />The ${config.name} Team</p>
        `;

        const html = getHtmlTemplate('Email Verification', content, brand);
        const bodyText = `Your email verification code for ${config.name} is: ${otp}`;

        const response = await dispatchEmail(email, subject, html, bodyText);
        return { status: 'success', message: 'Verification OTP email sent successfully', data: process.env.NODE_ENV === 'production' ? response : otp, statusCode: STATUS_CODES.SUCCESS };

    } catch (error) {
        console.error(`Failed to send email verification OTP: ${error}`);
        return { status: 'error', message: 'Failed to send email verification OTP', error };
    }
};

export const sendPasswordResetOTP = async ({ email, otp, brand = 'boxmap' }: { email: string, otp: string, brand?: BrandType }) => {
    try {
        const config = BRANDS[brand];
        if (!email || !otp) {
            return { status: 'error', message: 'Email or OTP is missing', data: null, statusCode: STATUS_CODES.BAD_REQUEST };
        }

        console.log(`Preparing Password Reset OTP for ${email} (${brand}): ${otp}`);

        const subject = `Reset Your Password - ${config.name}`;
        const content = `
            <p>Hello,</p>
            <p>We received a request to reset your password on <strong>${config.name}</strong>. Please use the following One-Time Password (OTP) to establish a new password:</p>
            
            <div class="otp-container">
                <span class="otp-code">${otp}</span>
            </div>

            <p class="note"><strong>Security Warning:</strong> This OTP will expire in 10 minutes. If you did not request a password reset, please change your account security settings immediately or contact support.</p>
            
            <p>Best regards,<br />The ${config.name} Team</p>
        `;

        const html = getHtmlTemplate('Password Reset Request', content, brand);
        const bodyText = `Your password reset code for ${config.name} is: ${otp}`;

        const response = await dispatchEmail(email, subject, html, bodyText);
        return { status: 'success', message: 'Password reset OTP email sent successfully', data: process.env.NODE_ENV === 'production' ? response : otp, statusCode: STATUS_CODES.SUCCESS };

    } catch (error) {
        console.error(`Failed to send password reset OTP: ${error}`);
        return { status: 'error', message: 'Failed to send password reset OTP', error };
    }
};

/**
 * Send an organization invitation email to an invitee who has a verified email address.
 * This is supplementary to the WhatsApp notification — only sent if email is verified.
 */
export const sendOrgInviteEmail = async ({
    email,
    orgName,
    inviterName,
    inviteeFirstName,
    brand = 'boxmap',
}: {
    email: string;
    orgName: string;
    inviterName: string;
    inviteeFirstName: string;
    brand?: BrandType;
}) => {
    try {
        const config = BRANDS[brand];
        if (!email) {
            return { status: 'error', message: 'Email is missing', data: null, statusCode: STATUS_CODES.BAD_REQUEST };
        }

        const subject = `You've been invited to join ${orgName} on ${config.name}`;
        const content = `
            <p>Hello ${inviteeFirstName},</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on ${config.name}.</p>
            <p>Open the BoxMap app to view and respond to your invitation. The invitation expires in <strong>7 days</strong>.</p>

            <div class="button-container">
                <a href="${config.url}" class="button">Open BoxMap App</a>
            </div>

            <p class="note">If you were not expecting this invitation, you can safely ignore this email. You can also decline the invitation directly in the app.</p>

            <p>Best regards,<br />The ${config.name} Team</p>
        `;

        const html = getHtmlTemplate(`You're invited to ${orgName}`, content, brand);
        const bodyText = `${inviterName} has invited you to join ${orgName} on ${config.name}. Open the BoxMap app to accept or decline.`;

        const response = await dispatchEmail(email, subject, html, bodyText);
        return { status: 'success', message: 'Invitation email sent successfully', data: response, statusCode: STATUS_CODES.SUCCESS };

    } catch (error) {
        console.error(`Failed to send org invite email: ${error}`);
        // Non-fatal — return error shape but don't throw
        return { status: 'error', message: 'Failed to send invitation email', error };
    }
};

