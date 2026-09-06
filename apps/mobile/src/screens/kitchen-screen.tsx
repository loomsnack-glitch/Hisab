import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { usePosKitchen } from "../hooks/use-pos-kitchen";

type KitchenScreenProps = NativeStackScreenProps<PosStackParamList, "Kitchen">;

const KitchenScreen = ({ navigation }: KitchenScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const session = usePosSessionSnapshot().session;
    const kitchen = usePosKitchen();
    const [pendingKotId, setPendingKotId] = useState<string | null>(null);
    const [completeError, setCompleteError] = useState(false);

    const completeKot = async (kotId: string) => {
        setPendingKotId(kotId);
        setCompleteError(false);
        try {
            await kitchen.complete(kotId);
        } catch {
            setCompleteError(true);
        } finally {
            setPendingKotId(null);
        }
    };

    if (!session?.store.kotSystemEnabled) {
        return (
            <View className="flex-1 bg-pos-background px-5 py-6 dark:bg-pos-background-dark">
                <PosCard>
                    <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("kitchen")}</Text>
                    <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("kitchenUnavailable")}</Text>
                    <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
                </PosCard>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <View className="gap-2">
                <Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">{t("kitchen")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("kitchenSubtitle")}</Text>
            </View>
            {kitchen.isPending ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("kitchenLoading")}</Text> : null}
            {kitchen.isError || completeError ? (
                <View className="gap-3">
                    <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{completeError ? t("kotCompleteFailed") : t("kitchenLoadFailed")}</Text>
                    <PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={kitchen.retry} />
                </View>
            ) : null}
            {!kitchen.isPending && !kitchen.isError && kitchen.kots.length === 0 ? (
                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("kitchenEmpty")}</Text>
            ) : null}
            {kitchen.kots.map((kot) => (
                <PosCard key={kot.id}>
                    <Text className="text-xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("kotNumber", { number: kot.kotNumber })}</Text>
                    {kot.tableLabel ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("kotTable", { table: kot.tableLabel })}</Text> : null}
                    <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("kotItems")}</Text>
                    {kot.items.map((item) => (
                        <View key={`${kot.id}:${item.productNameSnapshot}`} className="flex-row justify-between gap-3">
                            <Text className="flex-1 text-sm text-pos-foreground dark:text-pos-foreground-dark">{item.productNameSnapshot}</Text>
                            <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">× {item.quantity}</Text>
                        </View>
                    ))}
                    <PosButton label={t("completeKot")} loading={pendingKotId === kot.id} onPress={() => completeKot(kot.id)} />
                </PosCard>
            ))}
            <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
        </ScrollView>
    );
};

export default KitchenScreen;
