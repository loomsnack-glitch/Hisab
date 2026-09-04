import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosCart } from "../hooks/use-pos-cart";
import { getCartLineDisplayTotals } from "../lib/pos-cart-boundary";

type CartShellScreenProps = NativeStackScreenProps<PosStackParamList, "Cart">;

const CartShellScreen = ({ navigation }: CartShellScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const cart = usePosCart();
    const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);

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
                                key={item.lineId}
                                className="gap-3 rounded-2xl border border-pos-border bg-pos-surface-muted px-4 py-3 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark"
                            >
                                <View className="flex-row items-start justify-between gap-3">
                                    <Text className="flex-1 text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                                        {item.name}
                                    </Text>
                                    <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                                        {formatCurrency(getCartLineDisplayTotals(item).total)}
                                    </Text>
                                </View>
                                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">
                                    {t("cartLineUnitPrice", { price: formatCurrency(Number(item.price)) })}
                                </Text>
                                <View className="flex-row flex-wrap items-center gap-2">
                                    <PosButton
                                        label="−"
                                        variant="secondary"
                                        disabled={item.quantity === 1}
                                        onPress={() => cart.changeQuantity(item.lineId, -1)}
                                    />
                                    <Text className="min-w-8 text-center text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                                        {item.quantity}
                                    </Text>
                                    <PosButton label="+" variant="secondary" onPress={() => cart.changeQuantity(item.lineId, 1)} />
                                    <PosButton label={t("removeCartItem")} variant="destructive" onPress={() => cart.removeItem(item.lineId)} />
                                </View>
                            </View>
                        ))}
                        <View className="gap-1 border-t border-pos-border pt-3 dark:border-pos-border-dark">
                            <View className="flex-row justify-between gap-3">
                                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("cartSubtotal")}</Text>
                                <Text className="text-sm text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(cart.displayTotals.subtotal)}</Text>
                            </View>
                            <View className="flex-row justify-between gap-3">
                                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("catalogDiscount")}</Text>
                                <Text className="text-sm text-pos-foreground dark:text-pos-foreground-dark">− {formatCurrency(cart.displayTotals.discount)}</Text>
                            </View>
                            <View className="flex-row justify-between gap-3">
                                <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("cartDisplayTotal")}</Text>
                                <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(cart.displayTotals.total)}</Text>
                            </View>
                        </View>
                        <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("cartDisplayTotalNote")}</Text>
                    </View>
                )}
                <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
            </PosCard>
        </ScrollView>
    );
};

export default CartShellScreen;
