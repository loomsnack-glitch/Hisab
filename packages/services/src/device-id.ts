type DeviceIdProvider = {
    getDeviceId: () => Promise<string>;
};

let provider: DeviceIdProvider | null = null;
let memoryDeviceId: string | null = null;

export const configureDeviceIdProvider = (adapter: DeviceIdProvider) => {
    provider = adapter;
};

export const getDeviceId = async (): Promise<string | null> => {
    if (memoryDeviceId) {
        return memoryDeviceId;
    }

    if (!provider) {
        return null;
    }

    memoryDeviceId = await provider.getDeviceId();
    return memoryDeviceId;
};

export const hydrateDeviceId = async (): Promise<string | null> => {
    if (!provider) {
        return memoryDeviceId;
    }

    memoryDeviceId = await provider.getDeviceId();
    return memoryDeviceId;
};
