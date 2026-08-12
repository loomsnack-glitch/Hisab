import { WAMessageStatus } from "baileys";

export type NormalizedMessageStatus = "delivered" | "read";

export const normalizeMessageStatus = (status: number | null | undefined): NormalizedMessageStatus | null => {
    if (status === WAMessageStatus.READ || status === WAMessageStatus.PLAYED) return "read";
    if (status === WAMessageStatus.DELIVERY_ACK) return "delivered";
    return null;
};
