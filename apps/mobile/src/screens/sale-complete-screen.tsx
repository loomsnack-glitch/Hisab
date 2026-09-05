import { Share, ScrollView, Text } from "react-native";
import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PaymentStatusSummary } from "../components/payment-status-summary";
import { PosButton, PosCard } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { clearPosCompletedSale, usePosSaleCompleteStore } from "../store/pos-sale-complete.store";
import { buildPosDigitalReceiptText, sharePosDigitalReceipt, type PosReceiptShareAction } from "../lib/pos-receipt-boundary";

type SaleCompleteScreenProps = NativeStackScreenProps<PosStackParamList, "SaleComplete">;

const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);

const SaleCompleteScreen = ({ navigation }: SaleCompleteScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const sale = usePosSaleCompleteStore((state) => state.sale);
    const [receiptVisible, setReceiptVisible] = useState(false);
    const [shareState, setShareState] = useState<PosReceiptShareAction | "sharing" | null>(null);

    const startNewSale = () => {
        clearPosCompletedSale();
        navigation.replace("NewSale");
    };

    const shareReceipt = async () => {
        if (!sale) {
            return;
        }

        setShareState("sharing");
        const result = await sharePosDigitalReceipt(sale, (content) => Share.share(content));
        setShareState(result);
    };

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <PosCard>
                <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("saleCompleteTitle")}</Text>
                {sale ? (
                    <>
                        <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("saleCompleteMessage")}</Text>
                        <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                            {t("saleNumber")}: {sale.saleNumber ?? sale.id}
                        </Text>
                        <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                            {t("paymentTotal")}: {formatCurrency(sale.grandTotal)}
                        </Text>
                        <PaymentStatusSummary sale={sale} />
                        <PosButton label={receiptVisible ? t("hideReceipt") : t("showReceipt")} variant="secondary" onPress={() => setReceiptVisible((visible) => !visible)} />
                        {receiptVisible ? <Text className="rounded-2xl bg-pos-surface-muted p-4 text-sm leading-6 text-pos-foreground dark:bg-pos-surface-muted-dark dark:text-pos-foreground-dark">{buildPosDigitalReceiptText(sale)}</Text> : null}
                        <PosButton label={t("shareReceipt")} variant="secondary" onPress={shareReceipt} loading={shareState === "sharing"} />
                        {shareState === "shared" ? <Text className="text-sm text-pos-success dark:text-pos-success-dark">{t("receiptShared")}</Text> : null}
                        {shareState === "dismissed" ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("receiptShareDismissed")}</Text> : null}
                        {shareState === "failed" ? <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("receiptShareFailed")}</Text> : null}
                    </>
                ) : (
                    <Text className="text-sm leading-6 text-pos-danger dark:text-pos-danger-dark">{t("saleResultMissing")}</Text>
                )}
                <PosButton label={t("newSale")} onPress={startNewSale} />
            </PosCard>
        </ScrollView>
    );
};

export default SaleCompleteScreen;
