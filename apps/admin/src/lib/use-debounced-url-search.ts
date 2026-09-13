import { useEffect, useState } from "react";

export const VENDOR_SEARCH_DEBOUNCE_MS = 300;

export const useDebouncedUrlSearch = (
    searchFromUrl: string,
    onSearchChange: (search: string) => void | Promise<unknown>,
) => {
    const [searchInput, setSearchInput] = useState(searchFromUrl);

    useEffect(() => {
        setSearchInput(searchFromUrl);
    }, [searchFromUrl]);

    useEffect(() => {
        if (searchInput === searchFromUrl) return;

        const timeoutId = window.setTimeout(() => {
            void onSearchChange(searchInput);
        }, VENDOR_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [searchInput, searchFromUrl, onSearchChange]);

    const clearSearch = () => {
        setSearchInput("");
        void onSearchChange("");
    };

    return { searchInput, setSearchInput, clearSearch };
};
