import { useEffect, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import PrimaryButton from "../components/primary-button";
import { PosCard } from "../components/pos-ui";
import { getPosDestinations, type PosDestination } from "../lib/pos-navigation-boundary";
import type { PosTranslationKey } from "../lib/localization-boundary";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { usePosLogout } from "../hooks/use-pos-logout";

type PosShellScreenProps = NativeStackScreenProps<PosStackParamList, "PosHome">;

const destinationKeys: Record<PosDestination, PosTranslationKey> = {
    NewSale: "newSale",
    Bills: "bills",
    Customers: "customers",
    Reports: "reports",
    Settings: "settings",
    Tables: "tables",
    Kitchen: "kitchen",
};

const PosShellScreen = ({ navigation }: PosShellScreenProps) => {
    const redirectedToNewSale = useRef(false);
    const insets = useSafeAreaInsets();
    const { t: tCommon } = useTranslation("common");
    const { t: tPos } = useTranslation("pos");
    const session = usePosSessionSnapshot().session;
    const logoutMutation = usePosLogout();

    const destinations = getPosDestinations(session);

    useEffect(() => {
        if (redirectedToNewSale.current) {
            return;
        }

        redirectedToNewSale.current = true;
        navigation.navigate("NewSale");
    }, [navigation]);

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <PosCard>
                <Text className="text-xs font-bold uppercase tracking-[2px] text-pos-primary dark:text-pos-primary-dark">{tCommon("appName")}</Text>
                <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{tPos("workspaceTitle")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">
                    {tPos("foundationMessage")}
                </Text>
                <View className="gap-2">
                    {destinations.map((destination) => (
                        <Pressable
                            key={destination}
                            className="min-h-12 flex-row items-center justify-between rounded-2xl border border-pos-border bg-pos-surface-muted px-4 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark"
                            onPress={() => navigation.navigate(destination)}
                            accessibilityRole="button"
                        >
                            <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                                {tPos(destinationKeys[destination])}
                            </Text>
                            <Text className="text-lg text-pos-muted dark:text-pos-muted-dark">›</Text>
                        </Pressable>
                    ))}
                </View>
                <PrimaryButton
                    label={logoutMutation.isPending ? tCommon("loggingOut") : tCommon("logout")}
                    loading={logoutMutation.isPending}
                    onPress={() => logoutMutation.mutate()}
                />
            </PosCard>
        </ScrollView>
    );
};

export default PosShellScreen;
