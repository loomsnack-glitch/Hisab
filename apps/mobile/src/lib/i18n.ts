import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { POS_PREFERENCE_KEYS, posStorage } from "./storage";
import {
    APP_LANGUAGES,
    appResources,
    resolveAppLanguage,
    type AppLanguage,
} from "./localization-boundary";

const initialLanguage = resolveAppLanguage(
    posStorage.getPreference(POS_PREFERENCE_KEYS.language),
);

void i18n.use(initReactI18next).init({
    resources: appResources,
    lng: initialLanguage,
    fallbackLng: "en",
    supportedLngs: APP_LANGUAGES,
    ns: ["common", "pos"],
    defaultNS: "common",
    interpolation: {
        escapeValue: false,
    },
});

export const setAppLanguage = async (language: AppLanguage) => {
    posStorage.setPreference(POS_PREFERENCE_KEYS.language, language);
    await i18n.changeLanguage(language);
};

export { i18n };
