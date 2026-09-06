import { useDeferredValue, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { CustomerListQuery } from "@repo/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosTextField } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosCustomerDirectory } from "../hooks/use-pos-customer-directory";
import { normalizePosCustomerCreatePayload } from "../lib/pos-customer-boundary";

type CustomersScreenProps = NativeStackScreenProps<PosStackParamList, "Customers">;
type CustomerStatus = NonNullable<CustomerListQuery["status"]>;
type CustomerSort = NonNullable<CustomerListQuery["sort"]>;

const CustomersScreen = ({ navigation }: CustomersScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [status, setStatus] = useState<CustomerStatus>("active");
    const [sort, setSort] = useState<CustomerSort>("name_asc");
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [formError, setFormError] = useState<"name" | "phone" | "save" | null>(null);
    const directory = usePosCustomerDirectory({ search: deferredSearch, status, sort });

    const addCustomer = async () => {
        const result = normalizePosCustomerCreatePayload(name, phone);
        if (result.kind === "invalid") { setFormError(result.field); return; }
        setFormError(null);
        try {
            const response = await directory.create(result.payload);
            setName(""); setPhone(""); setAddOpen(false);
            navigation.navigate("CustomerDetails", { customer: response.customer });
        } catch { setFormError("save"); }
    };

    return <ScrollView className="flex-1 bg-pos-background dark:bg-pos-background-dark" contentContainerClassName="gap-5 px-5 py-6" contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}>
        <View className="gap-1"><Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">{t("customers")}</Text><Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("customersDirectorySubtitle")}</Text></View>
        <PosCard>
            <PosTextField label={t("customerSearch")} value={search} onChangeText={setSearch} placeholder={t("searchCustomersPlaceholder")} autoCapitalize="none" />
            <View className="flex-row gap-2"><PosButton label={t("addCustomer")} onPress={() => setAddOpen((open) => !open)} /><PosButton label={filtersOpen ? t("hideCustomerFilters") : t("showCustomerFilters")} variant="secondary" onPress={() => setFiltersOpen((open) => !open)} /></View>
            {addOpen ? <View className="gap-3 rounded-2xl border border-pos-border p-3 dark:border-pos-border-dark"><PosTextField label={t("customerName")} value={name} onChangeText={setName} placeholder={t("customerNamePlaceholder")} error={formError === "name" ? t("customerNameRequired") : undefined} /><PosTextField label={t("customerPhone")} value={phone} onChangeText={setPhone} placeholder={t("customerPhonePlaceholder")} keyboardType="phone-pad" error={formError === "phone" ? t("customerPhoneInvalid") : undefined} />{formError === "save" ? <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("customerSaveFailed")}</Text> : null}<PosButton label={t("saveCustomer")} loading={directory.createPending} onPress={() => { void addCustomer(); }} /></View> : null}
            {filtersOpen ? <View className="gap-3 rounded-2xl border border-pos-border p-3 dark:border-pos-border-dark"><Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("customerStatus")}</Text><View className="flex-row flex-wrap gap-2">{(["active", "all", "due", "inactive"] as const).map((value) => <PosButton key={value} label={t(value === "active" ? "customerActive" : value === "inactive" ? "customerInactive" : value === "due" ? "customerDue" : "customerAll")} variant={status === value ? "primary" : "secondary"} accessibilityState={{ selected: status === value }} onPress={() => setStatus(value)} />)}</View><Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("customerSort")}</Text><View className="flex-row flex-wrap gap-2">{(["name_asc", "name_desc", "newest"] as const).map((value) => <PosButton key={value} label={t(value === "name_asc" ? "customerSortNameAsc" : value === "name_desc" ? "customerSortNameDesc" : "customerSortNewest")} variant={sort === value ? "primary" : "secondary"} accessibilityState={{ selected: sort === value }} onPress={() => setSort(value)} />)}</View></View> : null}
        </PosCard>
        {directory.isPending ? <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("customersLoading")}</Text> : null}
        {directory.isError ? <PosCard><Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("customersLoadFailed")}</Text><PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={directory.retry} /></PosCard> : null}
        {!directory.isPending && !directory.isError && directory.customers.length === 0 ? <PosCard><Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("customersDirectoryEmpty")}</Text></PosCard> : null}
        {directory.customers.map((customer) => <PosCard key={customer.id}><View className="flex-row items-start justify-between gap-3"><View className="flex-1 gap-1"><Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{customer.name}</Text><Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{customer.phone || t("customerNoPhone")}</Text><Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("customerBalance")}: {customer.balance}</Text></View><PosButton label={t("viewCustomer")} variant="secondary" onPress={() => navigation.navigate("CustomerDetails", { customer })} /></View></PosCard>)}
        {directory.hasNextPage ? <PosButton label={t("customersLoadMore")} variant="secondary" loading={directory.isFetchingNextPage} onPress={directory.loadMore} /> : null}
        <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
    </ScrollView>;
};

export default CustomersScreen;
