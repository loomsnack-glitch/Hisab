export type ListViewMode = "card" | "table";

const LIST_VIEW_MODES = ["card", "table"] as const;

export const LIST_VIEW_PREFERENCES_STORAGE_PREFIX = "hisab_list_view_";

const storageKey = (pageKey: string) => `${LIST_VIEW_PREFERENCES_STORAGE_PREFIX}${pageKey}`;

const isListViewMode = (value: string): value is ListViewMode =>
    LIST_VIEW_MODES.includes(value as ListViewMode);

export const readListViewPreference = (pageKey: string): ListViewMode | null => {
    if (typeof window === "undefined" || !pageKey) {
        return null;
    }

    const key = storageKey(pageKey);

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw || raw === "undefined" || raw === "null") {
            if (raw === "undefined" || raw === "null") {
                window.localStorage.removeItem(key);
            }
            return null;
        }

        return isListViewMode(raw) ? raw : null;
    } catch {
        window.localStorage.removeItem(key);
        return null;
    }
};

export const writeListViewPreference = (pageKey: string, mode: ListViewMode) => {
    if (typeof window === "undefined" || !pageKey) {
        return;
    }

    try {
        window.localStorage.setItem(storageKey(pageKey), mode);
    } catch {
        // Local storage may be unavailable; the current view still works.
    }
};
