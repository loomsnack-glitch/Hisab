type AuthTokenStorage = {
    getItem: () => Promise<string | null>;
    setItem: (token: string) => Promise<void>;
    removeItem: () => Promise<void>;
};

let memoryToken: string | null = null;
let storage: AuthTokenStorage | null = null;

export const configureAuthTokenStorage = (adapter: AuthTokenStorage) => {
    storage = adapter;
};

export const setAuthToken = async (token: string) => {
    memoryToken = token;
    if (storage) {
        await storage.setItem(token);
    }
};

export const getAuthToken = async (): Promise<string | null> => {
    if (memoryToken) {
        return memoryToken;
    }

    if (storage) {
        memoryToken = await storage.getItem();
    }

    return memoryToken;
};

export const clearAuthToken = async () => {
    memoryToken = null;
    if (storage) {
        await storage.removeItem();
    }
};

export const hydrateAuthToken = async (): Promise<string | null> => {
    if (!storage) {
        return memoryToken;
    }

    memoryToken = await storage.getItem();
    return memoryToken;
};
