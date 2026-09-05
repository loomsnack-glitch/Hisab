import { ScrollView, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PaymentStatusSummary } from "../components/payment-status-summary";
import { PosButton, PosCard } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { clearPosCompletedSale, usePosSaleCompleteStore } from "../store/pos-sale-complete.store";

type SaleCompleteScreenProps = NativeStackScreenProps<PosStackParamList, "SaleComplete">;

const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);

const SaleCompleteScreen = ({ navigation }: SaleCompleteScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const sale = usePosSaleCompleteStore((state) => state.sale);

    const startNewSale = () => {
        clearPosCompletedSale();
        navigation.replace("NewSale");
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
