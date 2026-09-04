export const APP_LANGUAGES = ["en", "gu", "hi"] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const DEFAULT_APP_LANGUAGE: AppLanguage = "en";

export const appResources = {
    en: {
        common: {
            appName: "Ganatri POS",
            loading: "Loading",
            retry: "Retry",
            cancel: "Cancel",
            save: "Save",
            logout: "Logout",
            loggingOut: "Logging out...",
            loggedOutTitle: "Logged out",
            loggedOutMessage: "You have been logged out successfully.",
            logoutFailedTitle: "Logout failed",
            genericError: "Please try again.",
            language: "Language",
            english: "English",
            gujarati: "ગુજરાતી",
            hindi: "हिन्दी",
        },
        pos: {
            workspaceTitle: "POS workspace",
            foundationMessage:
                "The POS foundation is ready. Product selection, Cart, and checkout will be added in their planned phases.",
        },
    },
    gu: {
        common: {
            appName: "ગણત્રી POS",
            loading: "લોડ થઈ રહ્યું છે",
            retry: "ફરી પ્રયાસ કરો",
            cancel: "રદ કરો",
            save: "સાચવો",
            logout: "લૉગઆઉટ",
            loggingOut: "લૉગઆઉટ થઈ રહ્યું છે...",
            loggedOutTitle: "લૉગઆઉટ થયું",
            loggedOutMessage: "તમે સફળતાપૂર્વક લૉગઆઉટ થયા છો.",
            logoutFailedTitle: "લૉગઆઉટ નિષ્ફળ",
            genericError: "કૃપા કરીને ફરી પ્રયાસ કરો.",
            language: "ભાષા",
            english: "English",
            gujarati: "ગુજરાતી",
            hindi: "हिन्दी",
        },
        pos: {
            workspaceTitle: "POS કાર્યસ્થળ",
            foundationMessage:
                "POS પાયો તૈયાર છે. પ્રોડક્ટ પસંદગી, કાર્ટ અને ચેકઆઉટ તેમના નિર્ધારિત તબક્કામાં ઉમેરવામાં આવશે.",
        },
    },
    hi: {
        common: {
            appName: "गणत्री POS",
            loading: "लोड हो रहा है",
            retry: "फिर कोशिश करें",
            cancel: "रद्द करें",
            save: "सहेजें",
            logout: "लॉग आउट",
            loggingOut: "लॉग आउट हो रहा है...",
            loggedOutTitle: "लॉग आउट हो गया",
            loggedOutMessage: "आप सफलतापूर्वक लॉग आउट हो गए हैं।",
            logoutFailedTitle: "लॉग आउट विफल",
            genericError: "कृपया फिर कोशिश करें।",
            language: "भाषा",
            english: "English",
            gujarati: "ગુજરાતી",
            hindi: "हिन्दी",
        },
        pos: {
            workspaceTitle: "POS कार्यक्षेत्र",
            foundationMessage:
                "POS की नींव तैयार है। उत्पाद चयन, कार्ट और चेकआउट अपने निर्धारित चरणों में जोड़े जाएंगे।",
        },
    },
} as const;

export const isAppLanguage = (value: string | null | undefined): value is AppLanguage =>
    Boolean(value && APP_LANGUAGES.includes(value as AppLanguage));

export const resolveAppLanguage = (value: string | null | undefined): AppLanguage =>
    isAppLanguage(value) ? value : DEFAULT_APP_LANGUAGE;
