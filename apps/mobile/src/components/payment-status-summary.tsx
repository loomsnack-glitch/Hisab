import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { SaleSummaryDTO } from "@repo/types";
import { PosStatusBadge } from "./pos-ui";
import { getPosPaymentStatusPresentation } from "../lib/pos-payment-status-boundary";

type PaymentStatusSummaryProps = {
    sale: Pick<SaleSummaryDTO, "paymentStatus" | "grandTotal" | "paidTotal" | "dueTotal">;
};

const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);

export const PaymentStatusSummary = ({ sale }: PaymentStatusSummaryProps) => {
    const { t } = useTranslation("pos");
    const presentation = getPosPaymentStatusPresentation(sale);

    return (
        <View className="gap-3 rounded-2xl border border-pos-border bg-pos-surface-muted px-4 py-3 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark">
            <PosStatusBadge label={t(presentation.labelKey)} tone={presentation.tone} />
            <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t(presentation.descriptionKey)}</Text>
            <View className="gap-1">
                <View className="flex-row justify-between gap-3">
                    <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("paymentTotal")}</Text>
                    <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(presentation.grandTotal)}</Text>
                </View>
                <View className="flex-row justify-between gap-3">
                    <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("paymentCollected")}</Text>
                    <Text className="text-sm text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(presentation.paidTotal)}</Text>
                </View>
                <View className="flex-row justify-between gap-3">
                    <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("paymentRemaining")}</Text>
                    <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(presentation.dueTotal)}</Text>
                </View>
            </View>
        </View>
    );
};
