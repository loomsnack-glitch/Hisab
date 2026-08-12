import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
    BufferJSON,
    initAuthCreds,
    proto,
    type AuthenticationState,
    type SignalDataTypeMap,
} from "baileys";

const FILE_LOCKS = new Map<string, Promise<void>>();
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const encryptionKey = (secret: string) => createHash("sha256").update(secret, "utf8").digest();

const fileName = (value: string) => value.replace(/\//g, "__").replace(/:/g, "-");

const withFileLock = async <T>(path: string, task: () => Promise<T>): Promise<T> => {
    const previous = FILE_LOCKS.get(path) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>(resolve => {
        release = resolve;
    });
    const queued = previous.then(() => current);
    FILE_LOCKS.set(path, queued);

    await previous;
    try {
        return await task();
    } finally {
        release();
        if (FILE_LOCKS.get(path) === queued) {
            FILE_LOCKS.delete(path);
        }
    }
};

const encrypt = (value: unknown, key: Buffer): Buffer => {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const payload = Buffer.from(JSON.stringify(value, BufferJSON.replacer), "utf8");
    const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
};

const decrypt = (payload: Buffer, key: Buffer): unknown => {
    if (payload.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error("Encrypted auth state is invalid");
    }

    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"), BufferJSON.reviver);
};

const readEncrypted = async (path: string, key: Buffer): Promise<unknown | null> => {
    try {
        return decrypt(await readFile(path), key);
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
            return null;
        }
        throw new Error("Unable to read encrypted WhatsApp auth state");
    }
};

const writeEncrypted = async (path: string, value: unknown, key: Buffer): Promise<void> => {
    const temporaryPath = path + ".tmp-" + randomBytes(8).toString("hex");
    await writeFile(temporaryPath, encrypt(value, key), { mode: 0o600 });
    await rename(temporaryPath, path);
};

const removeEncrypted = async (path: string): Promise<void> => {
    await unlink(path).catch(error => {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
            throw error;
        }
    });
};

export const clearEncryptedAuthState = async (directory: string): Promise<void> => {
    await rm(directory, { recursive: true, force: true });
};

export const useEncryptedAuthState = async (directory: string, secret: string): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}> => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const key = encryptionKey(secret);
    const readData = async (name: string): Promise<unknown | null> =>
        withFileLock(join(directory, fileName(name)), () => readEncrypted(join(directory, fileName(name)), key));
    const writeData = async (value: unknown, name: string): Promise<void> =>
        withFileLock(join(directory, fileName(name)), () =>
            writeEncrypted(join(directory, fileName(name)), value, key),
        );
    const removeData = async (name: string): Promise<void> =>
        withFileLock(join(directory, fileName(name)), () => removeEncrypted(join(directory, fileName(name))));

    const creds = (await readData("creds.json")) as AuthenticationState["creds"] | null ?? initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
                    const data: { [id: string]: SignalDataTypeMap[T] } = {};
                    await Promise.all(
                        ids.map(async id => {
                            const value = await readData(type + "-" + id + ".json");
                            if (value) {
                                data[id] = (type === "app-state-sync-key"
                                    ? proto.Message.AppStateSyncKeyData.fromObject(value)
                                    : value) as SignalDataTypeMap[T];
                            }
                        }),
                    );
                    return data;
                },
                set: async values => {
                    const tasks: Promise<void>[] = [];
                    for (const type of Object.keys(values) as Array<keyof typeof values>) {
                        const entries = values[type];
                        if (!entries) continue;
                        for (const [id, value] of Object.entries(entries)) {
                            const name = type + "-" + id + ".json";
                            tasks.push(value ? writeData(value, name) : removeData(name));
                        }
                    }
                    await Promise.all(tasks);
                },
            },
        },
        saveCreds: () => writeData(creds, "creds.json"),
    };
};
