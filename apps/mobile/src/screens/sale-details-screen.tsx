import { Alert, Share, ScrollView, Text, View } from "react-native";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosStatusBadge } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosSale } from "../hooks/use-pos-sale";
import { usePosCatalog } from "../hooks/use-pos-catalog";
import { usePosConfiguration } from "../hooks/use-pos-configuration";
import { usePosDraftActions } from "../hooks/use-pos-draft-actions";
import { usePosCart } from "../hooks/use-pos-cart";
import { buildPosCartFromDraft } from "../lib/pos-draft-recovery-boundary";
import { getPosPaymentStatusPresentation } from "../lib/pos-payment-status-boundary";
import { buildPosDigitalReceiptText, sharePosDigitalReceipt, type PosReceiptShareAction } from "../lib/pos-receipt-boundary";
import { posBillsKeys } from "../lib/pos-bills-boundary";
import { usePosPrinter } from "../hooks/use-pos-printer";

type SaleDetailsScreenProps = NativeStackScreenProps<PosStackParamList, "SaleDetails">;

const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);
const formatDateTime = (value: string | Date) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const SaleDetailsScreen = ({ navigation, route }: SaleDetailsScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const queryClient = useQueryClient();
    const details = usePosSale(route.params.saleId);
    const catalog = usePosCatalog();
    const configuration = usePosConfiguration();
    const draftActions = usePosDraftActions();
    const cart = usePosCart();
    const [receiptVisible, setReceiptVisible] = useState(false);
    const [shareState, setShareState] = useState<PosReceiptShareAction | "sharing" | null>(null);
    const printer = usePosPrinter();
    const [actionError, setActionError] = useState<string | null>(null);
    const sale = details.sale;

    const shareReceipt = async () => {
        if (!sale || sale.status !== "completed") return;
        setShareState("sharing");
        setShareState(await sharePosDigitalReceipt(sale, (content) => Share.share(content)));
    };

    const printReceipt = () => {
        if (!sale || sale.status !== "completed") return;
        if (printer.status !== "connected") {
            navigation.navigate("PrinterSettings");
            return;
        }
        void printer.printReceipt(buildPosDigitalReceiptText(sale));
    };

    const performResumeDraft = () => {
        if (!sale || sale.status !== "draft") return;
        const recovery = buildPosCartFromDraft(sale, catalog.products, configuration);
        if (recovery.kind === "invalid") {
            setActionError(t("draftResumeFailed"));
            return;
        }
        cart.restoreDraft(recovery.items, recovery.customer, recovery.discount, sale.id);
        navigation.replace("Cart");
    };

    const resumeDraft = () => {
        if (cart.items.length === 0) {
            performResumeDraft();
            return;
        }

        Alert.alert(
            t("resumeDraft"),
            t("resumeDraftConfirm"),
            [
                { text: t("cancel", { ns: "common" }), style: "cancel" },
                { text: t("resumeDraft"), onPress: performResumeDraft },
            ],
        );
    };

    const discardDraft = async () => {
        if (!sale || sale.status !== "draft") return;
        setActionError(null);
        try {
            await draftActions.discard(sale.id);
            await queryClient.invalidateQueries({ queryKey: posBillsKeys.all });
            navigation.goBack();
        } catch {
            setActionError(t("draftActionFailed"));
        }
    };

    const confirmDiscardDraft = () => Alert.alert(
        t("discardDraft"),
        t("discardDraftConfirm"),
        [
            { text: t("cancel", { ns: "common" }), style: "cancel" },
            { text: t("discardDraft"), style: "destructive", onPress: () => { void discardDraft(); } },
        ],
    );

    return (
        <ScrollView className="flex-1 bg-pos-background dark:bg-pos-background-dark" contentContainerClassName="gap-5 px-5 py-6" contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}>
            {details.isPending ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("saleDetailsLoading")}</Text> : null}
            {details.isError ? <PosCard><Text className="text-sm leading-6 text-pos-danger dark:text-pos-danger-dark">{t("saleDetailsLoadFailed")}</Text><PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={details.retry} /></PosCard> : null}
            {!details.isPending && !details.isError && !sale ? <PosCard><Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("saleDetailsNoData")}</Text></PosCard> : null}
            {sale ? (
                <>
                    <PosCard>
                        <View className="flex-row items-start justify-between gap-3">
                            <View className="min-w-0 flex-1 gap-1">
                                <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("saleDetails")}</Text>
                                <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("saleNumber")}: {sale.saleNumber ?? sale.id}</Text>
                                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{formatDateTime(sale.createdAt)}</Text>
                                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("saleCustomer")}: {sale.customer?.name ?? sale.customerNameSnapshot ?? t("walkInCustomer")}</Text>
                            </View>
                            <PosStatusBadge label={sale.status === "draft" ? t("draft") : sale.status === "voided" ? t("saleStatusVoided") : t(getPosPaymentStatusPresentation(sale).labelKey)} tone={sale.status === "draft" ? "neutral" : sale.status === "voided" ? "danger" : getPosPaymentStatusPresentation(sale).tone} />
                        </View>
                        <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("saleSubtotal")}: {formatCurrency(sale.subtotal)}</Text>
                        <Text className="text-base text-pos-foreground dark:text-pos-foreground-dark">{t("saleDiscount")}: {formatCurrency(sale.discountTotal)}</Text>
                        <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("saleTotal")}: {formatCurrency(sale.grandTotal)}</Text>
                    </PosCard>
                    <PosCard>
                        <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("saleItems")}</Text>
                        {sale.items.map((item) => <View key={item.id} className="gap-1 border-b border-pos-border pb-3 dark:border-pos-border-dark"><View className="flex-row justify-between gap-3"><Text className="flex-1 text-base text-pos-foreground dark:text-pos-foreground-dark">{item.productNameSnapshot} × {item.quantity}</Text><Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(item.lineTotal)}</Text></View>{item.addOns.map((addOn) => <Text key={addOn.id} className="text-sm text-pos-muted dark:text-pos-muted-dark">+ {addOn.addOnNameSnapshot} × {addOn.totalQuantity}</Text>)}{item.bundleComponents.map((component) => <Text key={component.id} className="text-sm text-pos-muted dark:text-pos-muted-dark">+ {component.productNameSnapshot} × {component.totalQuantity}</Text>)}</View>)}
                    </PosCard>
                    {sale.status === "completed" ? <PosCard>
                        <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("salePayments")}</Text>
                        {sale.payments.map((payment) => <Text key={payment.id} className="text-sm text-pos-muted dark:text-pos-muted-dark">{payment.method.toUpperCase()}: {formatCurrency(payment.amount)}</Text>)}
                        <PosButton label={receiptVisible ? t("hideReceipt") : t("showReceipt")} variant="secondary" onPress={() => setReceiptVisible((visible) => !visible)} />
                        {receiptVisible ? <Text className="rounded-2xl bg-pos-surface-muted p-4 text-sm leading-6 text-pos-foreground dark:bg-pos-surface-muted-dark dark:text-pos-foreground-dark">{buildPosDigitalReceiptText(sale)}</Text> : null}
                        <PosButton label={t("shareReceipt")} variant="secondary" loading={shareState === "sharing"} onPress={shareReceipt} />
                        <PosButton label={t("printReceipt")} variant="secondary" loading={printer.status === "printing"} onPress={printReceipt} />
                        {printer.status === "failed" ? <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("printerPrintFailed")}</Text> : null}
                        {shareState === "shared" ? <Text className="text-sm text-pos-success dark:text-pos-success-dark">{t("receiptShared")}</Text> : null}
                        {shareState === "dismissed" ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("receiptShareDismissed")}</Text> : null}
                        {shareState === "failed" ? <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("receiptShareFailed")}</Text> : null}
                    </PosCard> : sale.status === "draft" ? <PosCard>
                        {actionError ? <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{actionError}</Text> : null}
                        <PosButton label={t("resumeDraft")} loading={catalog.isPending || configuration.isPending} onPress={resumeDraft} />
                        <PosButton label={t("discardDraft")} variant="destructive" loading={draftActions.discardPending} onPress={confirmDiscardDraft} />
                    </PosCard> : null}
                </>
            ) : null}
            <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
        </ScrollView>
    );
};

export default SaleDetailsScreen;
