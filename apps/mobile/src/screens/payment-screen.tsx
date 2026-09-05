import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosTextField } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosCart } from "../hooks/use-pos-cart";
import { usePosPayments } from "../hooks/use-pos-payments";
import type { PosPaymentMethod } from "../lib/pos-payment-boundary";

type PaymentScreenProps = NativeStackScreenProps<PosStackParamList, "Payment">;

const methods: PosPaymentMethod[] = ["cash", "upi", "card"];

const PaymentScreen = ({ navigation }: PaymentScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const cart = usePosCart();
    const payments = usePosPayments(cart.displayTotals.total);
    const [checkoutNotice, setCheckoutNotice] = useState(false);
    const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <PosCard>
                <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("paymentTitle")}</Text>
                <View className="gap-1 rounded-2xl border border-pos-border bg-pos-surface-muted px-4 py-3 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark">
                    <View className="flex-row justify-between gap-3">
                        <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("paymentTotal")}</Text>
                        <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(cart.displayTotals.total)}</Text>
                    </View>
                    <View className="flex-row justify-between gap-3">
                        <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("paymentCollected")}</Text>
                        <Text className="text-sm text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(payments.summary.collected)}</Text>
                    </View>
                    <View className="flex-row justify-between gap-3">
                        <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("paymentRemaining")}</Text>
                        <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(payments.summary.remaining)}</Text>
                    </View>
                </View>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("paymentServerNote")}</Text>
                {payments.rows.map((row, index) => (
                    <View key={row.id} className="gap-3 rounded-2xl border border-pos-border bg-pos-surface-muted px-4 py-3 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark">
                        <View className="flex-row items-center justify-between gap-3">
                            <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("paymentRow", { count: index + 1 })}</Text>
                            {payments.rows.length > 1 ? <PosButton label={t("removePayment")} variant="secondary" onPress={() => payments.removeRow(row.id)} /> : null}
                        </View>
                        <Text className="text-sm font-medium text-pos-foreground dark:text-pos-foreground-dark">{t("paymentMethod")}</Text>
                        <View className="flex-row flex-wrap gap-2">
                            {methods.map((method) => (
                                <PosButton
                                    key={method}
                                    label={t(`payment${method[0].toUpperCase()}${method.slice(1)}` as "paymentCash" | "paymentUpi" | "paymentCard")}
                                    variant={row.method === method ? "primary" : "secondary"}
                                    onPress={() => payments.updateRow(row.id, { method })}
                                />
                            ))}
                        </View>
                        <PosTextField
                            label={t("paymentAmount")}
                            value={row.amount}
                            onChangeText={(amount) => payments.updateRow(row.id, { amount })}
                            placeholder={t("paymentAmountPlaceholder")}
                            keyboardType="decimal-pad"
                        />
                    </View>
                ))}
                {payments.validation.kind === "invalid_amount" ? (
                    <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("paymentInvalidAmount")}</Text>
                ) : null}
                {payments.validation.kind === "over_total" ? (
                    <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("paymentOverTotal")}</Text>
                ) : null}
                <PosButton label={t("addPayment")} variant="secondary" onPress={payments.addRow} />
                <PosButton label={t("continueToCompleteSale")} onPress={() => setCheckoutNotice(true)} />
                {checkoutNotice ? <Text className="text-sm leading-6 text-pos-warning dark:text-pos-warning-dark">{t("paymentCheckoutComingSoon")}</Text> : null}
                <PosButton label={t("backToCart")} variant="secondary" onPress={() => navigation.goBack()} />
            </PosCard>
        </ScrollView>
    );
};

export default PaymentScreen;
