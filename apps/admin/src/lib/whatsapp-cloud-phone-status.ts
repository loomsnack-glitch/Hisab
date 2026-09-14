export const isMetaCloudPhoneRegistered = (status: string | null | undefined): boolean =>
    status === "CONNECTED";

export const isMetaCloudPhoneOnBizApp = (isOnBizApp: boolean | null | undefined): boolean =>
    isOnBizApp === true;

export const metaCloudPhoneStatusLabel = (status: string | null | undefined): "Registered" | "Not registered" =>
    isMetaCloudPhoneRegistered(status) ? "Registered" : "Not registered";
