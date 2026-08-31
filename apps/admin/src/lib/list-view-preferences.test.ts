import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
    window: testWindow,
    localStorage: testWindow.localStorage,
});

const {
    readListViewPreference,
    writeListViewPreference,
    LIST_VIEW_PREFERENCES_STORAGE_PREFIX,
} = await import("./list-view-preferences");

const pageKey = "money-accounts";
const storageKey = `${LIST_VIEW_PREFERENCES_STORAGE_PREFIX}${pageKey}`;

describe("List view preferences", () => {
    afterEach(() => {
        testWindow.localStorage.clear();
    });

    test("reads and writes the selected view mode", () => {
        writeListViewPreference(pageKey, "table");

        expect(readListViewPreference(pageKey)).toBe("table");
        expect(testWindow.localStorage.getItem(storageKey)).toBe("table");
    });

    test("ignores invalid stored values", () => {
        testWindow.localStorage.setItem(storageKey, "grid");

        expect(readListViewPreference(pageKey)).toBeNull();
    });

    test("returns null when nothing is stored", () => {
        expect(readListViewPreference(pageKey)).toBeNull();
    });
});
