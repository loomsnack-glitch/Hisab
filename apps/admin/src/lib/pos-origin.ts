export const DEFAULT_POS_ORIGIN = "http://localhost:5174";

export type PosLoginPrefill = {
    organizationUsername?: string;
    deviceUsername?: string;
};

export const getConfiguredPosOrigin = (posOrigin = import.meta.env.VITE_POS_ORIGIN) => {
    const origin = (typeof posOrigin === "string" ? posOrigin : "").trim() || DEFAULT_POS_ORIGIN;
    return origin.replace(/\/+$/, "");
};

export const getPosLoginUrl = (prefill: PosLoginPrefill = {}, posOrigin?: string) => {
    const url = new URL("login", `${getConfiguredPosOrigin(posOrigin)}/`);

    if (prefill.organizationUsername) {
        url.searchParams.set("org", prefill.organizationUsername);
    }

    if (prefill.deviceUsername) {
        url.searchParams.set("device", prefill.deviceUsername);
    }

    return url.toString();
};
