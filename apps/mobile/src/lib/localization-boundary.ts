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
            unlockTitle: "Unlock POS",
            unlockSubtitle: "Use your Store Device credentials to start billing.",
            organizationUsername: "Organization username",
            deviceUsername: "Device username",
            deviceSecret: "Device secret",
            unlockPos: "Unlock POS",
            unlockingPos: "Unlocking POS...",
            invalidField: "Please check this field.",
            invalidCredentials: "The Device credentials are not valid.",
            inactiveDevice: "This Device is inactive. Contact your administrator.",
            networkFailure: "Could not reach the POS service. Check the connection and try again.",
            unlockFailed: "POS could not be unlocked. Please try again.",
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
            unlockTitle: "POS અનલૉક કરો",
            unlockSubtitle: "બિલિંગ શરૂ કરવા માટે તમારા સ્ટોર ડિવાઇસની વિગતોનો ઉપયોગ કરો.",
            organizationUsername: "સંસ્થાનું યુઝરનેમ",
            deviceUsername: "ડિવાઇસ યુઝરનેમ",
            deviceSecret: "ડિવાઇસ સિક્રેટ",
            unlockPos: "POS અનલૉક કરો",
            unlockingPos: "POS અનલૉક થઈ રહ્યું છે...",
            invalidField: "કૃપા કરીને આ ફીલ્ડ તપાસો.",
            invalidCredentials: "ડિવાઇસની વિગતો માન્ય નથી.",
            inactiveDevice: "આ ડિવાઇસ નિષ્ક્રિય છે. તમારા એડમિનિસ્ટ્રેટરનો સંપર્ક કરો.",
            networkFailure: "POS સેવા સુધી પહોંચી શકાયું નથી. કનેક્શન તપાસી ફરી પ્રયાસ કરો.",
            unlockFailed: "POS અનલૉક થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.",
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
            unlockTitle: "POS अनलॉक करें",
            unlockSubtitle: "बिलिंग शुरू करने के लिए अपने स्टोर डिवाइस की जानकारी दें।",
            organizationUsername: "संगठन उपयोगकर्ता नाम",
            deviceUsername: "डिवाइस उपयोगकर्ता नाम",
            deviceSecret: "डिवाइस सीक्रेट",
            unlockPos: "POS अनलॉक करें",
            unlockingPos: "POS अनलॉक हो रहा है...",
            invalidField: "कृपया यह फ़ील्ड जाँचें।",
            invalidCredentials: "डिवाइस की जानकारी मान्य नहीं है।",
            inactiveDevice: "यह डिवाइस निष्क्रिय है। अपने एडमिनिस्ट्रेटर से संपर्क करें।",
            networkFailure: "POS सेवा से संपर्क नहीं हो सका। कनेक्शन जाँचकर फिर कोशिश करें।",
            unlockFailed: "POS अनलॉक नहीं हो सका। कृपया फिर कोशिश करें।",
        },
    },
} as const;

export const isAppLanguage = (value: string | null | undefined): value is AppLanguage =>
    Boolean(value && APP_LANGUAGES.includes(value as AppLanguage));

export const resolveAppLanguage = (value: string | null | undefined): AppLanguage =>
    isAppLanguage(value) ? value : DEFAULT_APP_LANGUAGE;
