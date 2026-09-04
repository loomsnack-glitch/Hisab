import { useDeferredValue, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosTextField } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosCart } from "../hooks/use-pos-cart";
import { getCartLineDisplayTotals, isPosCartDiscountValid, type PosCartDiscountMode } from "../lib/pos-cart-boundary";
import { usePosConfiguration } from "../hooks/use-pos-configuration";
import { resolvePosCartConfiguration } from "../lib/pos-cart-review-boundary";
import { usePosCustomers } from "../hooks/use-pos-customers";
import { useCreatePosCustomer } from "../hooks/use-create-pos-customer";
import { normalizePosCustomerCreatePayload } from "../lib/pos-customer-boundary";
import { buildPosDraftPayload, buildPosDraftUpdatePayload } from "../lib/pos-draft-boundary";
import { usePosDraftActions } from "../hooks/use-pos-draft-actions";

type CartShellScreenProps = NativeStackScreenProps<PosStackParamList, "Cart">;

const CartShellScreen = ({ navigation }: CartShellScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const cart = usePosCart();
    const configuration = usePosConfiguration();
    const [showPaymentNotice, setShowPaymentNotice] = useState(false);
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerCreateOpen, setCustomerCreateOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [newCustomerPhone, setNewCustomerPhone] = useState("");
    const [customerCreateFieldError, setCustomerCreateFieldError] = useState<"name" | "phone" | null>(null);
    const [discountEditorOpen, setDiscountEditorOpen] = useState(false);
    const [discountMode, setDiscountMode] = useState<PosCartDiscountMode>("percent");
    const [discountValue, setDiscountValue] = useState("");
    const [discountError, setDiscountError] = useState(false);
    const deferredCustomerSearch = useDeferredValue(customerSearch);
    const customersQuery = usePosCustomers(deferredCustomerSearch, customerPickerOpen);
    const customerCreate = useCreatePosCustomer();
    const draftActions = usePosDraftActions();
    const [draftNotice, setDraftNotice] = useState<"saved" | "discarded" | "error" | null>(null);
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
        setCustomerCreateOpen(false);
        setNewCustomerName("");
        setNewCustomerPhone("");
        setCustomerCreateFieldError(null);
        customerCreate.reset();
    };
    const openDiscountEditor = () => {
        setDiscountMode(cart.discount?.mode ?? "percent");
        setDiscountValue(cart.discount?.value.toString() ?? "");
        setDiscountError(false);
        setDiscountEditorOpen(true);
    };
    const applyDiscount = () => {
        const value = Number(discountValue.trim());
        const baseTotal = Math.max(0, cart.displayTotals.subtotal - cart.displayTotals.discount);
        const nextDiscount = { mode: discountMode, value } as const;
        if (!Number.isFinite(value) || !isPosCartDiscountValid(nextDiscount, baseTotal)) {
            setDiscountError(true);
            return;
        }

        cart.setDiscount(value === 0 ? null : nextDiscount);
        setDiscountError(false);
        setDiscountEditorOpen(false);
    };
    const saveDraft = async () => {
        if (cart.items.length === 0 || draftActions.savePending) {
            return;
        }

        const draftRequestId = cart.draftRequestId ?? Crypto.randomUUID();
        cart.setDraftRequestId(draftRequestId);
        try {
            const sale = await draftActions.save({
                draftSaleId: cart.draftSaleId,
                createPayload: buildPosDraftPayload({
                    items: cart.items,
                    customer: cart.customer,
                    discount: cart.discount,
                    draftRequestId,
                }),
                updatePayload: buildPosDraftUpdatePayload({
                    items: cart.items,
                    customer: cart.customer,
                    discount: cart.discount,
                }),
            });
            cart.setDraftSaleId(sale.id);
            setDraftNotice("saved");
        } catch {
            setDraftNotice("error");
        }
    };
    const discardDraft = async () => {
        if (!cart.draftSaleId || draftActions.discardPending) {
            return;
        }

        try {
            await draftActions.discard(cart.draftSaleId);
            cart.clearDraftSale();
            setDraftNotice("discarded");
        } catch {
            setDraftNotice("error");
        }
    };
    const submitCustomerCreate = async () => {
        const result = normalizePosCustomerCreatePayload(newCustomerName, newCustomerPhone);
        if (result.kind === "invalid") {
            setCustomerCreateFieldError(result.field);
            return;
        }

        setCustomerCreateFieldError(null);
        try {
            const response = await customerCreate.create(result.payload);
            selectCustomer(response.customer);
        } catch {
            // Keep the form and Cart intact so the cashier can retry.
        }
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
                                    {customerCreateOpen ? (
                                        <View className="gap-3 border-t border-pos-border pt-3 dark:border-pos-border-dark">
                                            <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("quickCustomer")}</Text>
                                            <PosTextField
                                                label={t("customerName")}
                                                value={newCustomerName}
                                                onChangeText={setNewCustomerName}
                                                placeholder={t("customerNamePlaceholder")}
                                                error={customerCreateFieldError === "name" ? t("customerNameRequired") : undefined}
                                            />
                                            <PosTextField
                                                label={t("customerPhone")}
                                                value={newCustomerPhone}
                                                onChangeText={setNewCustomerPhone}
                                                placeholder={t("customerPhonePlaceholder")}
                                                keyboardType="phone-pad"
                                                error={customerCreateFieldError === "phone" ? t("customerPhoneInvalid") : undefined}
                                            />
                                            {customerCreate.error ? (
                                                <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("customerCreateFailed")}</Text>
                                            ) : null}
                                            <View className="flex-row flex-wrap gap-2">
                                                <PosButton label={t("cancelCustomerCreation")} variant="secondary" onPress={() => setCustomerCreateOpen(false)} />
                                                <PosButton label={t("saveCustomer")} loading={customerCreate.isPending} onPress={submitCustomerCreate} />
                                            </View>
                                        </View>
                                    ) : (
                                        <PosButton
                                            label={t("createCustomer")}
                                            variant="secondary"
                                            onPress={() => {
                                                setCustomerCreateOpen(true);
                                                customerCreate.reset();
                                                setCustomerCreateFieldError(null);
                                            }}
                                        />
                                    )}
                                </View>
                            ) : null}
                        </View>
                        <View className="gap-2 rounded-2xl border border-pos-border bg-pos-surface-muted px-4 py-3 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark">
                            <View className="flex-row items-center justify-between gap-3">
                                <View className="min-w-0 flex-1">
                                    <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("orderDiscount")}</Text>
                                    {cart.displayTotals.orderDiscount > 0 ? (
                                        <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">
                                            − {formatCurrency(cart.displayTotals.orderDiscount)}
                                        </Text>
                                    ) : null}
                                </View>
                                <View className="flex-row flex-wrap justify-end gap-2">
                                    <PosButton label={cart.discount ? t("editDiscount") : t("addDiscount")} variant="secondary" onPress={openDiscountEditor} />
                                    {cart.discount ? (
                                        <PosButton label={t("removeDiscount")} variant="secondary" onPress={() => cart.setDiscount(null)} />
                                    ) : null}
                                </View>
                            </View>
                            {discountEditorOpen ? (
                                <View className="gap-3 border-t border-pos-border pt-3 dark:border-pos-border-dark">
                                    <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("discountEditorTitle")}</Text>
                                    <View className="flex-row flex-wrap gap-2">
                                        <PosButton label={t("discountModeAmount")} variant={discountMode === "amount" ? "primary" : "secondary"} onPress={() => setDiscountMode("amount")} />
                                        <PosButton label={t("discountModePercent")} variant={discountMode === "percent" ? "primary" : "secondary"} onPress={() => setDiscountMode("percent")} />
                                    </View>
                                    <PosTextField
                                        label={t("discountValue")}
                                        value={discountValue}
                                        onChangeText={(value) => {
                                            setDiscountValue(value);
                                            setDiscountError(false);
                                        }}
                                        placeholder={discountMode === "percent" ? t("discountPercentPlaceholder") : t("discountAmountPlaceholder")}
                                        keyboardType="decimal-pad"
                                        error={discountError ? t("discountInvalid") : undefined}
                                    />
                                    {discountMode === "percent" ? (
                                        <View className="flex-row flex-wrap gap-2">
                                            {[5, 10, 15].map((preset) => (
                                                <PosButton key={preset} label={`${preset}%`} variant="secondary" onPress={() => setDiscountValue(String(preset))} />
                                            ))}
                                        </View>
                                    ) : null}
                                    <View className="flex-row flex-wrap gap-2">
                                        <PosButton label={t("cancelDiscount")} variant="secondary" onPress={() => setDiscountEditorOpen(false)} />
                                        <PosButton label={t("applyDiscount")} onPress={applyDiscount} />
                                    </View>
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
                            {cart.displayTotals.orderDiscount > 0 ? (
                                <View className="flex-row justify-between gap-3">
                                    <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("orderDiscount")}</Text>
                                    <Text className="text-sm text-pos-foreground dark:text-pos-foreground-dark">− {formatCurrency(cart.displayTotals.orderDiscount)}</Text>
                                </View>
                            ) : null}
                            <View className="flex-row justify-between gap-3">
                                <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("cartDisplayTotal")}</Text>
                                <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{formatCurrency(cart.displayTotals.total)}</Text>
                            </View>
                        </View>
                        <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("cartDisplayTotalNote")}</Text>
                        <View className="flex-row flex-wrap gap-2">
                            <PosButton
                                label={cart.draftSaleId ? t("updateDraft") : t("saveDraft")}
                                loading={draftActions.savePending}
                                onPress={saveDraft}
                            />
                            {cart.draftSaleId ? (
                                <PosButton label={t("discardDraft")} variant="destructive" loading={draftActions.discardPending} onPress={discardDraft} />
                            ) : null}
                        </View>
                        {draftNotice === "saved" ? (
                            <Text className="text-sm text-pos-success dark:text-pos-success-dark">{t("draftSaved")}</Text>
                        ) : null}
                        {draftNotice === "discarded" ? (
                            <Text className="text-sm text-pos-success dark:text-pos-success-dark">{t("draftDiscarded")}</Text>
                        ) : null}
                        {draftNotice === "error" ? (
                            <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("draftActionFailed")}</Text>
                        ) : null}
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
