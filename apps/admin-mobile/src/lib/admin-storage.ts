import * as Keychain from "react-native-keychain";
import * as Crypto from "expo-crypto";
import {
    configureAuthTokenStorage,
    configureDeviceIdProvider,
} from "@repo/services";

const ADMIN_AUTH_SERVICE = "ganatri-admin-session";
const ADMIN_AUTH_ACCOUNT = "admin-user-token";
const ADMIN_INSTALLATION_SERVICE = "ganatri-admin-installation";
const ADMIN_INSTALLATION_ACCOUNT = "admin-installation-id";

const readKeychainValue = async (service: string): Promise<string | null> => {
    const credentials = await Keychain.getGenericPassword({ service });
    return credentials === false ? null : credentials.password;
};

const writeKeychainValue = async (service: string, account: string, value: string): Promise<void> => {
    const saved = await Keychain.setGenericPassword(account, value, { service });
    if (saved === false) {
        throw new Error(`Unable to protect Admin mobile value for ${service}`);
    }
};

const getAdminInstallationId = async (): Promise<string> => {
    const existingId = await readKeychainValue(ADMIN_INSTALLATION_SERVICE);
    if (existingId) {
        return existingId;
    }

    const installationId = Crypto.randomUUID();
    await writeKeychainValue(ADMIN_INSTALLATION_SERVICE, ADMIN_INSTALLATION_ACCOUNT, installationId);
    return installationId;
};

export const adminStorage = {
    getAuthToken: () => readKeychainValue(ADMIN_AUTH_SERVICE),
    setAuthToken: (token: string) => writeKeychainValue(ADMIN_AUTH_SERVICE, ADMIN_AUTH_ACCOUNT, token),
    clearAuthToken: async () => {
        await Keychain.resetGenericPassword({ service: ADMIN_AUTH_SERVICE });
    },
    getInstallationId: getAdminInstallationId,
};

configureAuthTokenStorage({
    getItem: adminStorage.getAuthToken,
    setItem: adminStorage.setAuthToken,
    removeItem: adminStorage.clearAuthToken,
});

configureDeviceIdProvider({ getDeviceId: adminStorage.getInstallationId });
