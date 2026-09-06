import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosSessionSnapshot } from "../store/pos-session.store";
import { usePosTables } from "../hooks/use-pos-tables";
import { groupPosTablesByArea } from "../lib/pos-tables-boundary";

type TablesScreenProps = NativeStackScreenProps<PosStackParamList, "Tables">;
type ActiveTableState = "engaged" | "ready_to_bill";

const TablesScreen = ({ navigation }: TablesScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const session = usePosSessionSnapshot().session;
    const tablesQuery = usePosTables();
    const [pendingTableId, setPendingTableId] = useState<string | null>(null);
    const [actionError, setActionError] = useState(false);
    const groups = groupPosTablesByArea(tablesQuery.tables, tablesQuery.areas);

    const openTable = async (table: (typeof tablesQuery.tables)[number]) => {
        setPendingTableId(table.id);
        setActionError(false);
        try {
            const context = table.state === "free" || table.state === "allocated"
                ? await tablesQuery.startTable(table)
                : await tablesQuery.openTable(table);
            navigation.navigate("NewSale", { table: context });
        } catch {
            setActionError(true);
        } finally {
            setPendingTableId(null);
        }
    };

    if (!session?.store.tableManagementEnabled) {
        return (
            <View className="flex-1 bg-pos-background px-5 py-6 dark:bg-pos-background-dark">
                <PosCard>
                    <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("tables")}</Text>
                    <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("tablesUnavailable")}</Text>
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
                <Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">{t("tables")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("tablesSubtitle")}</Text>
            </View>
            {tablesQuery.isPending ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("tablesLoading")}</Text> : null}
            {tablesQuery.isError || actionError ? (
                <View className="gap-3">
                    <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("tablesLoadFailed")}</Text>
                    <PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={tablesQuery.retry} />
                </View>
            ) : null}
            {!tablesQuery.isPending && !tablesQuery.isError && groups.length === 0 ? (
                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("tablesEmpty")}</Text>
            ) : null}
            {groups.map((group) => (
                <PosCard key={group.areaId ?? "unassigned"}>
                    <Text className="text-xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{group.title}</Text>
                    {group.tables.map((table) => {
                        const canOpen = table.state === "free" || table.state === "allocated" || (table.state as ActiveTableState) === "engaged" || (table.state as ActiveTableState) === "ready_to_bill";
                        return (
                            <View key={table.id} className="gap-2 rounded-2xl border border-pos-border bg-pos-surface-muted px-4 py-3 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark">
                                <View className="flex-row items-center justify-between gap-3">
                                    <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{table.tableLabel}</Text>
                                    <Text className="text-sm font-semibold text-pos-primary dark:text-pos-primary-dark">{t(`tableState${table.state.replace(/(^|_)([a-z])/g, (_, _separator, letter) => letter.toUpperCase())}` as "tableStateFree")}</Text>
                                </View>
                                {table.capacity ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("tableCapacity", { count: table.capacity })}</Text> : null}
                                {table.currentSaleTotal !== null ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("tableTotal", { total: new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(table.currentSaleTotal) })}</Text> : null}
                                {canOpen ? (
                                    <PosButton
                                        label={table.state === "free" || table.state === "allocated" ? t("startTableOrder") : t("openTableOrder")}
                                        loading={pendingTableId === table.id}
                                        onPress={() => openTable(table)}
                                    />
                                ) : null}
                            </View>
                        );
                    })}
                </PosCard>
            ))}
            <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
        </ScrollView>
    );
};

export default TablesScreen;
