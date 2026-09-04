import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosTextField } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";

type NewSaleScreenProps = NativeStackScreenProps<PosStackParamList, "NewSale">;

const NewSaleScreen = ({ navigation }: NewSaleScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const [search, setSearch] = useState("");

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
                <Text className="text-sm leading-5 text-pos-muted dark:text-pos-muted-dark">{t("catalogComingSoon")}</Text>
            </PosCard>
            <PosButton label={t("cart")} onPress={() => navigation.navigate("Cart")} />
        </ScrollView>
    );
};

export default NewSaleScreen;
