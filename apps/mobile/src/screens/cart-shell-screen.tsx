import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosCart } from "../hooks/use-pos-cart";

type CartShellScreenProps = NativeStackScreenProps<PosStackParamList, "Cart">;

const CartShellScreen = ({ navigation }: CartShellScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const cart = usePosCart();

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <PosCard>
                <Text className="text-2xl font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("cart")}</Text>
                <Text className="text-lg font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                    {t("cartWithCount", { count: cart.itemCount })}
                </Text>
                {cart.itemCount === 0 ? (
                    <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("emptyCart")}</Text>
                ) : (
                    <View className="gap-2">
                        {cart.items.map((item) => (
                            <View
                                key={item.id}
                                className="flex-row items-center justify-between rounded-2xl border border-pos-border bg-pos-surface-muted px-4 py-3 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark"
                            >
                                <Text className="flex-1 text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                                    {item.name}
                                </Text>
                                <Text className="text-sm font-semibold text-pos-muted dark:text-pos-muted-dark">
                                    × {item.quantity}
                                </Text>
                            </View>
                        ))}
                        <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("cartComingSoon")}</Text>
                    </View>
                )}
                <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
            </PosCard>
        </ScrollView>
    );
};

export default CartShellScreen;
