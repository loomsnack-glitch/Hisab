import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosTextField } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosCatalog } from "../hooks/use-pos-catalog";

type NewSaleScreenProps = NativeStackScreenProps<PosStackParamList, "NewSale">;

const NewSaleScreen = ({ navigation }: NewSaleScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const [search, setSearch] = useState("");
    const catalog = usePosCatalog();

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <View className="gap-2">
                <Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">{t("newSale")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("catalogComingSoon")}</Text>
            </View>
            <PosCard>
                <PosTextField
                    label={t("productSearch")}
                    value={search}
                    onChangeText={setSearch}
                    placeholder={t("searchProductsPlaceholder")}
                    autoCapitalize="none"
                />
                {catalog.isPending ? (
                    <View className="flex-row items-center gap-2">
                        <ActivityIndicator />
                        <Text className="text-sm leading-5 text-pos-muted dark:text-pos-muted-dark">{t("catalogLoading")}</Text>
                    </View>
                ) : null}
                {catalog.isError ? (
                    <View className="gap-3">
                        <Text className="text-sm leading-5 text-pos-danger dark:text-pos-danger-dark">{t("catalogLoadFailed")}</Text>
                        <PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={catalog.retry} />
                    </View>
                ) : null}
                {catalog.isSuccess && catalog.products.length === 0 && catalog.categories.length === 0 ? (
                    <Text className="text-sm leading-5 text-pos-muted dark:text-pos-muted-dark">{t("catalogEmpty")}</Text>
                ) : null}
                {catalog.isSuccess && (catalog.products.length > 0 || catalog.categories.length > 0) ? (
                    <Text className="text-sm leading-5 text-pos-muted dark:text-pos-muted-dark">{t("catalogReady")}</Text>
                ) : null}
            </PosCard>
            <PosButton label={t("cart")} onPress={() => navigation.navigate("Cart")} />
        </ScrollView>
    );
};

export default NewSaleScreen;
