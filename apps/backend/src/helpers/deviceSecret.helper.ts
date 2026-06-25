const DEVICE_SECRET_KEY_SOURCE = process.env.DEVICE_SECRET_ENCRYPTION_KEY || process.env.JWT_SECRET;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toBase64 = (value: Uint8Array) => Buffer.from(value).toString("base64");
const fromBase64 = (value: string) => new Uint8Array(Buffer.from(value, "base64"));

const getDeviceSecretKey = async () => {
    if (!DEVICE_SECRET_KEY_SOURCE) {
        throw new Error("DEVICE_SECRET_ENCRYPTION_KEY or JWT_SECRET is required for device secret encryption");
    }

    const keyDigest = await crypto.subtle.digest("SHA-256", textEncoder.encode(DEVICE_SECRET_KEY_SOURCE));
    return crypto.subtle.importKey(
        "raw",
        keyDigest,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
    );
};

export const encryptDeviceSecret = async (deviceSecret: string) => {
    const key = await getDeviceSecretKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv,
        },
        key,
        textEncoder.encode(deviceSecret),
    );

    return `${toBase64(iv)}:${toBase64(new Uint8Array(encrypted))}`;
};

export const decryptDeviceSecret = async (encryptedValue: string) => {
    const [ivPart, cipherPart] = encryptedValue.split(":");
    if (!ivPart || !cipherPart) {
        throw new Error("Invalid encrypted device secret format");
    }

    const key = await getDeviceSecretKey();
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: fromBase64(ivPart),
        },
        key,
        fromBase64(cipherPart),
    );

    return textDecoder.decode(decrypted);
};
