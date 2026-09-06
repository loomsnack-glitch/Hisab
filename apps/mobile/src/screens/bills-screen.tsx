import { useDeferredValue, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosStatusBadge, PosTextField } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosSales } from "../hooks/use-pos-sales";
import {
    type PosBillsDateFilter,
    type PosBillsPaymentMethodFilter,
    type PosBillsPaymentStatusFilter,
    type PosBillsStatusFilter,
} from "../lib/pos-bills-boundary";
import { getPosPaymentStatusPresentation } from "../lib/pos-payment-status-boundary";

type BillsScreenProps = NativeStackScreenProps<PosStackParamList, "Bills">;

const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);
const formatDateTime = (value: string | Date) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const BillsScreen = ({ navigation }: BillsScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const [search, setSearch] = useState("");
    const [view, setView] = useState<PosBillsStatusFilter>("completed");
    const deferredSearch = useDeferredValue(search);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [date, setDate] = useState<PosBillsDateFilter>("today");
    const [paymentStatus, setPaymentStatus] = useState<PosBillsPaymentStatusFilter>("all");
    const [paymentMethod, setPaymentMethod] = useState<PosBillsPaymentMethodFilter>("all");
    const bills = usePosSales({ status: view, date, paymentStatus, paymentMethod, search: deferredSearch });

    const resetFilters = () => {
        setDate(view === "draft" ? "all" : "today");
        setPaymentStatus("all");
        setPaymentMethod("all");
        setSearch("");
    };

    const switchView = (nextView: PosBillsStatusFilter) => {
        setView(nextView);
        setDate(nextView === "draft" ? "all" : "today");
        setPaymentStatus("all");
        setPaymentMethod("all");
    };

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <View className="gap-1">
                <Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">{t("bills")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("billsSubtitle")}</Text>
            </View>
            <PosCard>
                <View className="flex-row gap-2">
                    <PosButton label={t("billsSales")} variant={view === "completed" ? "primary" : "secondary"} accessibilityState={{ selected: view === "completed" }} onPress={() => switchView("completed")} />
                    <PosButton label={t("billsDrafts")} variant={view === "draft" ? "primary" : "secondary"} accessibilityState={{ selected: view === "draft" }} onPress={() => switchView("draft")} />
                </View>
                <PosTextField
                    label={t("billsSearch")}
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t("billsSearchPlaceholder")}
                    autoCapitalize="none"
                />
                <PosButton label={filtersOpen ? t("billsHideFilters") : t("billsFilter")} variant="secondary" onPress={() => setFiltersOpen((open) => !open)} />
                {filtersOpen ? (
                    <View className="gap-3 rounded-2xl border border-pos-border bg-pos-surface-muted p-3 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark">
                        <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("billsDate")}</Text>
                        <View className="flex-row flex-wrap gap-2">
                            <PosButton label={t("billsToday")} variant={date === "today" ? "primary" : "secondary"} accessibilityState={{ selected: date === "today" }} onPress={() => setDate("today")} />
                            <PosButton label={t("billsAllDates")} variant={date === "all" ? "primary" : "secondary"} accessibilityState={{ selected: date === "all" }} onPress={() => setDate("all")} />
                        </View>
                        <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("billsPaymentStatus")}</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {(["all", "paid", "partial", "due"] as const).map((value) => (
                                <PosButton
                                    key={value}
                                    label={t(value === "all" ? "billsAll" : value === "paid" ? "paymentStatusPaid" : value === "partial" ? "paymentStatusPartial" : "paymentStatusDue")}
                                    variant={paymentStatus === value ? "primary" : "secondary"}
                                    accessibilityState={{ selected: paymentStatus === value }}
                                    onPress={() => setPaymentStatus(value)}
                                />
                            ))}
                        </View>
                        <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("billsPaymentMethod")}</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {(["all", "cash", "upi", "card"] as const).map((value) => (
                                <PosButton
                                    key={value}
                                    label={t(value === "all" ? "billsAll" : value === "cash" ? "paymentCash" : value === "upi" ? "paymentUpi" : "paymentCard")}
                                    variant={paymentMethod === value ? "primary" : "secondary"}
                                    accessibilityState={{ selected: paymentMethod === value }}
                                    onPress={() => setPaymentMethod(value)}
                                />
                            ))}
                        </View>
                        <PosButton label={t("billsClearFilters")} variant="secondary" onPress={resetFilters} />
                    </View>
                ) : null}
            </PosCard>
            {date === "all" || paymentStatus !== "all" || paymentMethod !== "all" ? (
                <View className="flex-row flex-wrap gap-2">
                    {date === "all" ? <PosButton label={`${t("billsDate")}: ${t("billsAllDates")}`} variant="secondary" onPress={() => setDate("today")} /> : null}
                    {paymentStatus !== "all" ? <PosButton label={`${t("billsPaymentStatus")}: ${t(paymentStatus === "paid" ? "paymentStatusPaid" : paymentStatus === "partial" ? "paymentStatusPartial" : "paymentStatusDue")}`} variant="secondary" onPress={() => setPaymentStatus("all")} /> : null}
                    {paymentMethod !== "all" ? <PosButton label={`${t("billsPaymentMethod")}: ${t(paymentMethod === "cash" ? "paymentCash" : paymentMethod === "upi" ? "paymentUpi" : "paymentCard")}`} variant="secondary" onPress={() => setPaymentMethod("all")} /> : null}
                </View>
            ) : null}
            {bills.isPending ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("billsLoading")}</Text> : null}
            {bills.isError ? (
                <PosCard>
                    <Text className="text-sm leading-6 text-pos-danger dark:text-pos-danger-dark">{t("billsLoadFailed")}</Text>
                    <PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={bills.retry} />
                </PosCard>
            ) : null}
            {!bills.isPending && !bills.isError && bills.sales.length === 0 ? (
                <PosCard>
                    <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{view === "draft" ? t("billsNoDrafts") : date !== "today" || search.trim() || paymentStatus !== "all" || paymentMethod !== "all" ? t("billsNoMatchingSales") : t("billsNoSales")}</Text>
                </PosCard>
            ) : null}
            {bills.sales.map((sale) => {
                const presentation = getPosPaymentStatusPresentation(sale);
                return (
                    <Pressable key={sale.id} onPress={() => navigation.navigate("SaleDetails", { saleId: sale.id })} accessibilityRole="button">
                        <PosCard>
                            <View className="flex-row items-start justify-between gap-3">
                                <View className="min-w-0 flex-1 gap-1">
                                    <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("billsSaleNumber")}: {sale.saleNumber ?? sale.id}</Text>
                                    <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{formatDateTime(sale.createdAt)}</Text>
                                    <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("billsCustomer")}: {sale.customerNameSnapshot ?? sale.customer?.name ?? t("walkInCustomer")}</Text>
                                </View>
                                <PosStatusBadge label={view === "draft" ? t("draft") : t(presentation.labelKey)} tone={view === "draft" ? "neutral" : presentation.tone} />
                            </View>
                            <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(sale.grandTotal)}</Text>
                        </PosCard>
                    </Pressable>
                );
            })}
            {bills.hasNextPage ? <PosButton label={t("billsLoadMore")} variant="secondary" loading={bills.isFetchingNextPage} onPress={bills.loadMore} /> : null}
            <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
        </ScrollView>
    );
};

export default BillsScreen;
