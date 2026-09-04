import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";

type CartShellScreenProps = NativeStackScreenProps<PosStackParamList, "Cart">;

const CartShellScreen = ({ navigation }: CartShellScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <PosCard>
                <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("cart")}</Text>
                <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("emptyCart")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("cartComingSoon")}</Text>
                <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
            </PosCard>
        </ScrollView>
    );
};

export default CartShellScreen;
