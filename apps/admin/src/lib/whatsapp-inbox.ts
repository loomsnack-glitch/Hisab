type ConversationSearchItem = {
    displayName?: string | null;
    contactPhoneNumber?: string | null;
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
