import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosStatusBadge, PosTextField } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosCustomerDirectory } from "../hooks/use-pos-customer-directory";
import { usePosSales } from "../hooks/use-pos-sales";
import { normalizePosCustomerUpdatePayload } from "../lib/pos-customer-boundary";
import { usePosCart } from "../hooks/use-pos-cart";

type Props = NativeStackScreenProps<PosStackParamList, "CustomerDetails">;

const CustomerDetailsScreen = ({ navigation, route }: Props) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const [customer, setCustomer] = useState(route.params.customer);
    const [editOpen, setEditOpen] = useState(false);
    const [name, setName] = useState(customer.name);
    const [phone, setPhone] = useState(customer.phone ?? "");
    const [error, setError] = useState<"name" | "phone" | "save" | null>(null);
    const directory = usePosCustomerDirectory({ search: "", status: "all", sort: "name_asc" });
    const sales = usePosSales({ status: "completed", customerId: customer.id, date: "all", paymentStatus: "all", paymentMethod: "all", search: "" });

    const save = async () => {
        const result = normalizePosCustomerUpdatePayload(name, phone);
        if (result.kind === "invalid") { setError(result.field); return; }
        try { const response = await directory.update({ customerId: customer.id, payload: result.payload }); setCustomer(response.customer); setName(response.customer.name); setPhone(response.customer.phone ?? ""); setEditOpen(false); setError(null); } catch { setError("save"); }
    };
    const cart = usePosCart();

    return <ScrollView className="flex-1 bg-pos-background dark:bg-pos-background-dark" contentContainerClassName="gap-5 px-5 py-6" contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}><PosCard><View className="flex-row items-center justify-between gap-3"><Text className="flex-1 text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{customer.name}</Text><PosStatusBadge label={customer.isActive ? t("customerActive") : t("customerInactive")} tone={customer.isActive ? "success" : "neutral"} /></View><Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{customer.phone || t("customerNoPhone")}</Text><Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("customerBalance")}: {customer.balance}</Text><PosButton label={t("useCustomerForSale")} variant="secondary" onPress={() => { cart.selectCustomer(customer); navigation.goBack(); }} /><PosButton label={editOpen ? t("cancel", { ns: "common" }) : t("editCustomer")} variant="secondary" onPress={() => { setError(null); setEditOpen((open) => !open); }} />{editOpen ? <View className="gap-3"><PosTextField label={t("customerName")} value={name} onChangeText={setName} error={error === "name" ? t("customerNameRequired") : error === "save" ? t("customerSaveFailed") : undefined} /><PosTextField label={t("customerPhone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={error === "phone" ? t("customerPhoneInvalid") : undefined} /><PosButton label={t("saveCustomer")} loading={directory.updatePending} onPress={() => { void save(); }} /></View> : null}</PosCard><PosCard><Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("customerSalesHistory")}</Text>{sales.isPending ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("salesHistoryLoading")}</Text> : null}{sales.isError ? <><Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("salesHistoryFailed")}</Text><PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={sales.retry} /></> : null}{!sales.isPending && !sales.isError && sales.sales.length === 0 ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("salesHistoryEmpty")}</Text> : null}{sales.sales.map((sale) => <Text key={sale.id} className="text-sm text-pos-muted dark:text-pos-muted-dark">{sale.saleNumber ?? sale.id} — {sale.grandTotal}</Text>)}</PosCard><PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} /></ScrollView>;
};

export default CustomerDetailsScreen;
