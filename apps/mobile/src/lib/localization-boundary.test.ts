import { describe, expect, it } from "bun:test";
import {
    APP_LANGUAGES,
    DEFAULT_APP_LANGUAGE,
    isAppLanguage,
    resolveAppLanguage,
    appResources,
} from "./localization-boundary";

describe("localization boundary", () => {
    const billsKeys = [
        "billsSubtitle",
        "billsSearch",
        "billsSearchPlaceholder",
        "billsFilter",
        "billsHideFilters",
        "billsDate",
        "billsToday",
        "billsAllDates",
        "billsPaymentStatus",
        "billsPaymentMethod",
        "billsAll",
        "billsClearFilters",
        "billsLoading",
        "billsLoadFailed",
        "billsNoSales",
        "billsNoDrafts",
        "billsNoMatchingSales",
        "billsSaleNumber",
        "billsCustomer",
        "billsLoadMore",
        "saleDetails",
        "saleDetailsComingSoon",
        "saleDetailsLoading",
        "saleDetailsLoadFailed",
        "saleDetailsNoData",
        "saleItems",
        "salePayments",
        "saleSubtotal",
        "saleDiscount",
        "saleTotal",
        "resumeDraft",
        "resumeDraftConfirm",
        "draftResumeFailed",
        "discardDraftConfirm",
        "saleStatusVoided",
    ] as const;
    const reportsKeys = [
        "reportsSubtitle",
        "reportsDate",
        "reportsToday",
        "reportsAllDates",
        "reportsLoading",
        "reportsLoadFailed",
        "reportsEmpty",
        "salesSummary",
        "salesCount",
        "salesValue",
        "collectedAmount",
        "dueAmount",
        "averageSaleValue",
        "productsSold",
        "noProductsSold",
    ] as const;
    const settingsKeys = [
        "settingsSubtitle",
        "settingsTheme",
        "themeLight",
        "themeDark",
        "themeSystem",
        "themeActive",
        "settingsDisplaySize",
        "displayStandard",
        "displayLarge",
        "settingsPrinter",
        "printerSettings",
        "printerSettingsDeferred",
        "storeInformation",
        "organizationName",
        "storeName",
        "deviceName",
        "printerSettingsSubtitle",
        "selectedPrinter",
        "discoverPrinters",
        "connectPrinter",
        "disconnectPrinter",
        "testPrint",
        "retryPrinter",
        "printerDisconnected",
        "printerDiscovering",
        "printerConnecting",
        "printerConnected",
        "printerTesting",
        "printerPrinting",
        "printerFailed",
        "printReceipt",
        "printerPrintFailed",
    ] as const;
    const restaurantKeys = [
        "serviceMode",
        "serviceModeDineIn",
        "serviceModePickUp",
        "tableOrder",
        "tablesSubtitle",
        "tablesUnavailable",
        "tablesLoading",
        "tablesLoadFailed",
        "tablesEmpty",
        "tableCapacity",
        "tableTotal",
        "startTableOrder",
        "openTableOrder",
        "tableStateFree",
        "tableStateAllocated",
        "tableStateEngaged",
        "tableStateReadyToBill",
        "tableStatePaymentDue",
        "tableStatePaid",
        "kitchen",
        "kitchenSubtitle",
        "kitchenUnavailable",
        "kitchenLoading",
        "kitchenLoadFailed",
        "kitchenEmpty",
        "kotNumber",
        "kotTable",
        "kotItems",
        "completeKot",
        "kotCompleteFailed",
        "sendToKitchen",
        "kotSent",
        "kotSendFailed",
    ] as const;

    it("supports the approved interface languages", () => {
        expect(APP_LANGUAGES).toEqual(["en", "gu", "hi"]);
        expect(Object.keys(appResources)).toEqual([...APP_LANGUAGES]);
        expect(isAppLanguage("en")).toBe(true);
        expect(isAppLanguage("gu")).toBe(true);
        expect(isAppLanguage("hi")).toBe(true);
    });

    it("falls back to English for missing or unsupported values", () => {
        expect(resolveAppLanguage(null)).toBe(DEFAULT_APP_LANGUAGE);
        expect(resolveAppLanguage("fr")).toBe(DEFAULT_APP_LANGUAGE);
        expect(resolveAppLanguage("en-US")).toBe(DEFAULT_APP_LANGUAGE);
    });

    it("keeps supported persisted values unchanged", () => {
        expect(resolveAppLanguage("gu")).toBe("gu");
        expect(resolveAppLanguage("hi")).toBe("hi");
    });

    it("provides Bills, Reports, Settings, and Sale Details copy in every interface language", () => {
        for (const language of APP_LANGUAGES) {
            for (const key of billsKeys) {
                expect(appResources[language].pos[key]).toBeTruthy();
            }
            for (const key of reportsKeys) {
                expect(appResources[language].pos[key]).toBeTruthy();
            }
            for (const key of settingsKeys) {
                expect(appResources[language].pos[key]).toBeTruthy();
            }
            for (const key of restaurantKeys) {
                expect(appResources[language].pos[key]).toBeTruthy();
            }
        }
    });
});
