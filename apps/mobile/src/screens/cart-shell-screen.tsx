import { useDeferredValue, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosTextField } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosCart } from "../hooks/use-pos-cart";
import { getCartLineDisplayTotals } from "../lib/pos-cart-boundary";
import { usePosConfiguration } from "../hooks/use-pos-configuration";
import { resolvePosCartConfiguration } from "../lib/pos-cart-review-boundary";
import { usePosCustomers } from "../hooks/use-pos-customers";

type CartShellScreenProps = NativeStackScreenProps<PosStackParamList, "Cart">;

const CartShellScreen = ({ navigation }: CartShellScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const cart = usePosCart();
    const configuration = usePosConfiguration();
    const [showPaymentNotice, setShowPaymentNotice] = useState(false);
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const deferredCustomerSearch = useDeferredValue(customerSearch);
    const customersQuery = usePosCustomers(deferredCustomerSearch, customerPickerOpen);
    const formatCurrency = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(value);
    const configurationLookup = {
        addOnNames: new Map(configuration.attachments.map((attachment) => [attachment.addOnId, attachment.addOn.name])),
        comboGroups: configuration.combos.flatMap((combo) => combo.choiceGroups.map((group) => ({
            id: group.id,
            name: group.name,
            options: group.options.map((option) => ({ optionProductId: option.optionProductId, name: option.product.name })),
        }))),
    };
    const selectCustomer = (customer: Parameters<typeof cart.selectCustomer>[0]) => {
        cart.selectCustomer(customer);
        setCustomerSearch("");
        setCustomerPickerOpen(false);
    };

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
                        <View className="gap-2 rounded-2xl border border-pos-border bg-pos-surface-muted px-4 py-3 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark">
                            <View className="flex-row items-center justify-between gap-3">
                                <View className="min-w-0 flex-1">
                                    <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                                        {cart.customer?.name ?? t("walkInCustomer")}
                                    </Text>
                                    {cart.customer?.phone ? (
                                        <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{cart.customer.phone}</Text>
                                    ) : null}
                                </View>
                                <View className="flex-row flex-wrap justify-end gap-2">
                                    <PosButton
                                        label={cart.customer ? t("changeCustomer") : t("selectCustomer")}
                                        variant="secondary"
                                        onPress={() => setCustomerPickerOpen((open) => !open)}
                                    />
                                    {cart.customer ? (
                                        <PosButton label={t("clearCustomer")} variant="secondary" onPress={() => selectCustomer(null)} />
                                    ) : null}
                                </View>
                            </View>
                            {customerPickerOpen ? (
                                <View className="gap-3 border-t border-pos-border pt-3 dark:border-pos-border-dark">
                                    <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("customerPickerTitle")}</Text>
                                    <PosTextField
                                        label={t("customerSearch")}
                                        value={customerSearch}
                                        onChangeText={setCustomerSearch}
                                        placeholder={t("searchCustomersPlaceholder")}
                                        autoCapitalize="none"
                                    />
                                    {customersQuery.isPending ? (
                                        <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("customersLoading")}</Text>
                                    ) : null}
                                    {customersQuery.isError ? (
                                        <View className="gap-2">
                                            <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("customersLoadFailed")}</Text>
                                            <PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={customersQuery.retry} />
                                        </View>
                                    ) : null}
                                    {!customersQuery.isPending && !customersQuery.isError && customersQuery.customers.length === 0 ? (
                                        <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("noCustomersFound")}</Text>
                                    ) : null}
                                    {customersQuery.customers.map((customer) => (
                                        <PosButton
                                            key={customer.id}
                                            label={customer.phone ? `${customer.name} · ${customer.phone}` : customer.name}
                                            variant="secondary"
                                            onPress={() => selectCustomer(customer)}
                                        />
                                    ))}
                                </View>
                            ) : null}
                        </View>
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
                                {item.configuration ? (() => {
                                    const details = resolvePosCartConfiguration(item.configuration, configurationLookup);
                                    return details.addOns.length > 0 || details.comboSelections.length > 0 ? (
                                        <View className="gap-1 border-t border-pos-border pt-2 dark:border-pos-border-dark">
                                            <Text className="text-xs font-semibold text-pos-muted dark:text-pos-muted-dark">{t("configurationDetails")}</Text>
                                            {details.addOns.map((addOn) => (
                                                <Text key={addOn.addOnId} className="text-sm text-pos-muted dark:text-pos-muted-dark">
                                                    + {addOn.name} × {addOn.quantity}
                                                </Text>
                                            ))}
                                            {details.comboSelections.map((selection) => (
                                                <View key={`${selection.groupId}:${selection.optionProductId}`} className="gap-1">
                                                    <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">
                                                        {selection.groupName}: {selection.optionName} × {selection.quantity}
                                                    </Text>
                                                    {selection.addOns.map((addOn) => (
                                                        <Text key={`${selection.groupId}:${selection.optionProductId}:${addOn.addOnId}`} className="pl-3 text-xs text-pos-muted dark:text-pos-muted-dark">
                                                            + {addOn.name} × {addOn.quantity}
                                                        </Text>
                                                    ))}
                                                </View>
                                            ))}
                                        </View>
                                    ) : null;
                                })() : null}
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
                        {showPaymentNotice ? (
                            <Text className="text-sm leading-6 text-pos-warning dark:text-pos-warning-dark">{t("paymentComingSoon")}</Text>
                        ) : null}
                    </View>
                )}
                {cart.itemCount > 0 ? (
                    <PosButton label={t("continueToPayment")} onPress={() => setShowPaymentNotice(true)} />
                ) : null}
                <PosButton label={t("back")} variant="secondary" onPress={() => navigation.goBack()} />
            </PosCard>
        </ScrollView>
    );
};

export default CartShellScreen;
