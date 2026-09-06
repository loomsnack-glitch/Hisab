import { ScrollView, Text, View } from "react-native";
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard } from "../components/pos-ui";
import { usePosReports } from "../hooks/use-pos-reports";
import type { PosReportsDateFilter } from "../lib/pos-reports-boundary";
import type { PosStackParamList } from "../navigation/pos-navigator";

type ReportsScreenProps = NativeStackScreenProps<PosStackParamList, "Reports">;

const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);

const ReportsScreen = ({ navigation }: ReportsScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const [date, setDate] = useState<PosReportsDateFilter>("today");
    const reports = usePosReports(date);

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <View className="gap-1">
                <Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">{t("reports")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("reportsSubtitle")}</Text>
            </View>
            <PosCard>
                <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("reportsDate")}</Text>
                <View className="flex-row flex-wrap gap-2">
                    <PosButton label={t("reportsToday")} variant={date === "today" ? "primary" : "secondary"} accessibilityState={{ selected: date === "today" }} onPress={() => setDate("today")} />
                    <PosButton label={t("reportsAllDates")} variant={date === "all" ? "primary" : "secondary"} accessibilityState={{ selected: date === "all" }} onPress={() => setDate("all")} />
                </View>
            </PosCard>
            {reports.isPending ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("reportsLoading")}</Text> : null}
            {reports.isError ? <PosCard><Text className="text-sm leading-6 text-pos-danger dark:text-pos-danger-dark">{t("reportsLoadFailed")}</Text><PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={reports.retry} /></PosCard> : null}
            {!reports.isPending && !reports.isError && !reports.summary && reports.products.length === 0 ? <PosCard><Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("reportsEmpty")}</Text></PosCard> : null}
            {!reports.isPending && !reports.isError && reports.summary ? (
                <PosCard>
                    <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("salesSummary")}</Text>
                    <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("salesCount")}: {reports.summary.completedCount}</Text>
                    <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("salesValue")}: {formatCurrency(reports.summary.salesTotal)}</Text>
                    <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("collectedAmount")}: {formatCurrency(reports.summary.collectedTotal)}</Text>
                    <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("dueAmount")}: {formatCurrency(reports.summary.dueTotal)}</Text>
                    <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("averageSaleValue")}: {formatCurrency(reports.averageSaleValue)}</Text>
                </PosCard>
            ) : null}
            {!reports.isPending && !reports.isError ? (
                <PosCard>
                    <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("productsSold")}</Text>
                    {reports.products.length === 0 ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("noProductsSold")}</Text> : reports.products.map((product) => (
                        <View key={product.productId} className="flex-row justify-between gap-3 border-b border-pos-border pb-3 dark:border-pos-border-dark">
                            <View className="min-w-0 flex-1"><Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{product.productName}</Text>{product.categoryName ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{product.categoryName}</Text> : null}</View>
                            <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{product.quantitySold}</Text>
                        </View>
                    ))}
                </PosCard>
            ) : null}
            <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
        </ScrollView>
    );
};

export default ReportsScreen;
