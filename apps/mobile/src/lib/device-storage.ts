import * as SecureStore from "expo-secure-store";
import { configureDeviceIdProvider } from "@repo/services";

const DEVICE_ID_KEY = "ganatri_device_id";

const createDeviceId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    return `mobile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

configureDeviceIdProvider({
    getDeviceId: async () => {
        const existingDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        if (existingDeviceId) {
            return existingDeviceId;
        }

        const deviceId = createDeviceId();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
        return deviceId;
    },
});
