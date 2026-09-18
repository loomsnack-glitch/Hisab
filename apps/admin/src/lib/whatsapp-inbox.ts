type ConversationSearchItem = {
    displayName?: string | null;
    contactPhoneNumber?: string | null;
};

export const WHATSAPP_REPLY_WINDOW_MS = 24 * 60 * 60 * 1_000;

export const getWhatsAppReplyWindow = (
    lastInboundAt: string | Date | null | undefined,
    now = new Date(),
): { isOpen: boolean; expiresAt: Date | null } => {
    if (!lastInboundAt) return { isOpen: false, expiresAt: null };
    const inbound = new Date(lastInboundAt);
    const nowMs = now.getTime();
    if (Number.isNaN(inbound.getTime()) || Number.isNaN(nowMs)) return { isOpen: false, expiresAt: null };
    const expiresAt = new Date(inbound.getTime() + WHATSAPP_REPLY_WINDOW_MS);
    return {
        isOpen: inbound.getTime() <= nowMs && nowMs <= expiresAt.getTime(),
        expiresAt,
    };
};

export const filterWhatsAppConversations = <T extends ConversationSearchItem>(
    conversations: readonly T[],
    search: string,
): T[] => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const normalizedPhoneSearch = search.replace(/\D/g, "");
    return conversations.filter((conversation) => {
        const displayName = conversation.displayName ?? "";
        const contactPhoneNumber = conversation.contactPhoneNumber ?? "";
        const matchesSearch = normalizedSearch.length === 0
            || displayName.toLocaleLowerCase().includes(normalizedSearch)
            || contactPhoneNumber.toLocaleLowerCase().includes(normalizedSearch)
            || (normalizedPhoneSearch.length > 0 && contactPhoneNumber.replace(/\D/g, "").includes(normalizedPhoneSearch));
        return matchesSearch;
    });
};
