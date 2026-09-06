import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useUniwind } from "uniwind";
import { PosButton, PosCard } from "../components/pos-ui";
import { usePosLogout } from "../hooks/use-pos-logout";
import { setAppLanguage, i18n } from "../lib/i18n";
import { getPosDisplaySize, getPosTheme, setPosDisplaySize, setPosTheme } from "../lib/appearance";
import { APP_LANGUAGES, resolveAppLanguage, type AppLanguage } from "../lib/localization-boundary";
import { POS_DISPLAY_SIZES, POS_THEMES, type PosDisplaySize, type PosTheme } from "../lib/pos-appearance-boundary";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosSessionSnapshot } from "../store/pos-session.store";

type SettingsScreenProps = NativeStackScreenProps<PosStackParamList, "Settings">;

const languageLabel = (language: AppLanguage) => language === "en" ? "english" : language === "gu" ? "gujarati" : "hindi";

const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation(["common", "pos"]);
    const { theme: activeTheme } = useUniwind();
    const session = usePosSessionSnapshot().session;
    const [language, setLanguage] = useState<AppLanguage>(resolveAppLanguage(i18n.resolvedLanguage));
    const [theme, setTheme] = useState<PosTheme>(getPosTheme());
    const [displaySize, setDisplaySize] = useState<PosDisplaySize>(getPosDisplaySize());
    const logoutMutation = usePosLogout();

    const changeLanguage = (nextLanguage: AppLanguage) => {
        setLanguage(nextLanguage);
        void setAppLanguage(nextLanguage);
    };
    const changeTheme = (nextTheme: PosTheme) => {
        setTheme(nextTheme);
        setPosTheme(nextTheme);
    };
    const changeDisplaySize = (nextDisplaySize: PosDisplaySize) => {
        setDisplaySize(nextDisplaySize);
        setPosDisplaySize(nextDisplaySize);
    };

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <View className="gap-1">
                <Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">{t("settings", { ns: "pos" })}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("settingsSubtitle", { ns: "pos" })}</Text>
            </View>
            <PosCard>
                <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("language")}</Text>
                <View className="flex-row flex-wrap gap-2">
                    {APP_LANGUAGES.map((value) => <PosButton key={value} label={t(languageLabel(value))} variant={language === value ? "primary" : "secondary"} accessibilityState={{ selected: language === value }} onPress={() => changeLanguage(value)} />)}
                </View>
            </PosCard>
            <PosCard>
                <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("settingsTheme", { ns: "pos" })}</Text>
                <View className="flex-row flex-wrap gap-2">
                    {POS_THEMES.map((value) => <PosButton key={value} label={t(value === "light" ? "themeLight" : value === "dark" ? "themeDark" : "themeSystem", { ns: "pos" })} variant={theme === value ? "primary" : "secondary"} accessibilityState={{ selected: theme === value }} onPress={() => changeTheme(value)} />)}
                </View>
                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("themeActive", { ns: "pos", theme: activeTheme })}</Text>
            </PosCard>
            <PosCard>
                <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("settingsDisplaySize", { ns: "pos" })}</Text>
                <View className="flex-row flex-wrap gap-2">
                    {POS_DISPLAY_SIZES.map((value) => <PosButton key={value} label={t(value === "standard" ? "displayStandard" : "displayLarge", { ns: "pos" })} variant={displaySize === value ? "primary" : "secondary"} accessibilityState={{ selected: displaySize === value }} onPress={() => changeDisplaySize(value)} />)}
                </View>
            </PosCard>
            <PosCard>
                <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("settingsPrinter", { ns: "pos" })}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("printerSettingsDeferred", { ns: "pos" })}</Text>
                <PosButton label={t("printerSettings", { ns: "pos" })} variant="secondary" onPress={() => Alert.alert(t("printerSettings", { ns: "pos" }), t("printerSettingsDeferred", { ns: "pos" }))} />
            </PosCard>
            {session ? <PosCard>
                <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("storeInformation", { ns: "pos" })}</Text>
                <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("organizationName", { ns: "pos" })}: {session.organization.name}</Text>
                <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("storeName", { ns: "pos" })}: {session.store.name}</Text>
                <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("deviceName", { ns: "pos" })}: {session.device.name}</Text>
            </PosCard> : null}
            <PosButton label={t("logout")} variant="destructive" loading={logoutMutation.isPending} onPress={() => logoutMutation.mutate()} />
            <PosButton label={t("back", { ns: "pos" })} variant="secondary" onPress={() => navigation.goBack()} />
        </ScrollView>
    );
};

export default SettingsScreen;
