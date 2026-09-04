import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { PosButton, PosCard, PosTextField } from "../components/pos-ui";
import type { PosStackParamList } from "../navigation/pos-navigator";
import { usePosCatalog } from "../hooks/use-pos-catalog";
import { filterCatalogProducts } from "../lib/pos-catalog-boundary";
import {
    normalizePosBarcodeData,
    resolvePosProductCode,
    shouldAcceptPosBarcodeScan,
    POS_BARCODE_SCAN_COOLDOWN_MS,
} from "../lib/pos-barcode-boundary";
import { usePosCart } from "../hooks/use-pos-cart";
import { usePosConvenience } from "../hooks/use-pos-convenience";
import { usePosConfiguration } from "../hooks/use-pos-configuration";
import {
    clampSelectionQuantity,
    countGroupSelections,
    getActiveChoiceGroups,
    getActiveProductAddOns,
    isComboConfigurationValid,
} from "../lib/pos-configuration-boundary";
import type { PosCartConfiguration } from "../lib/pos-cart-boundary";

type NewSaleScreenProps = NativeStackScreenProps<PosStackParamList, "NewSale">;
type ProductQuickFilter = "all" | "recent" | "pinned";

const NewSaleScreen = ({ navigation }: NewSaleScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const [search, setSearch] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [productQuickFilter, setProductQuickFilter] = useState<ProductQuickFilter>("all");
    const [configuredProductId, setConfiguredProductId] = useState<string | null>(null);
    const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>({});
    const [comboQuantities, setComboQuantities] = useState<Record<string, number>>({});
    const [comboAddOnQuantities, setComboAddOnQuantities] = useState<Record<string, number>>({});
    const [showScanner, setShowScanner] = useState(false);
    const [scanLocked, setScanLocked] = useState(false);
    const [scanFeedback, setScanFeedback] = useState<
        | "scannerPermissionDenied"
        | "scannerCameraError"
        | "scannerUnknownCode"
        | "scannerAmbiguousCode"
        | "scannerAdded"
        | "scannerConfigurationComingSoon"
        | null
    >(null);
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const lastAcceptedScan = useRef<{ data: string | null; at: number | null }>({ data: null, at: null });
    const scanUnlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const catalog = usePosCatalog();
    const cart = usePosCart();
    const convenience = usePosConvenience(catalog.products);
    const configuration = usePosConfiguration();
    const filteredCatalogProducts = filterCatalogProducts(catalog.products, search, selectedCategoryId);
    const filteredRecentProducts = filterCatalogProducts(convenience.recentProducts, search, selectedCategoryId);
    const filteredPinnedProducts = filterCatalogProducts(convenience.pinnedProducts, search, selectedCategoryId);
    const filteredProducts =
        productQuickFilter === "recent"
            ? filteredRecentProducts
            : productQuickFilter === "pinned"
              ? filteredPinnedProducts
              : filteredCatalogProducts;
    const recentProducts = search.trim() === "" && productQuickFilter === "all"
        ? filterCatalogProducts(convenience.recentProducts, "", selectedCategoryId)
        : [];
    const configuredProduct = catalog.products.find((product) => product.id === configuredProductId) ?? null;
    const configuredCombo = configuration.combos.find((combo) => combo.product.id === configuredProductId) ?? null;
    const configuredChoiceGroups = configuredCombo ? getActiveChoiceGroups(configuredCombo.choiceGroups) : [];
    const configuredAddOns = configuredProductId
        ? getActiveProductAddOns(configuration.attachments, configuredProductId)
        : [];
    const selectedComboSelections = configuredChoiceGroups.flatMap((group) =>
        group.options.flatMap((option) => {
            const quantity = comboQuantities[`${group.id}:${option.optionProductId}`] ?? 0;
            const optionAddOns = getActiveProductAddOns(configuration.attachments, option.optionProductId);
            return quantity > 0
                ? [{
                    groupId: group.id,
                    optionProductId: option.optionProductId,
                    quantity,
                    addOns: optionAddOns.flatMap((attachment) => {
                        const addOnQuantity = comboAddOnQuantities[`${group.id}:${option.optionProductId}:${attachment.addOnId}`] ?? 0;
                        return addOnQuantity > 0 ? [{ addOnId: attachment.addOnId, quantity: addOnQuantity }] : [];
                    }),
                }]
                : [];
        }),
    );
    const configurationPending = configuredProduct?.productType === "combo"
        ? configuration.combosPending
        : configuration.addOnsPending;
    const configurationError = configuredProduct?.productType === "combo"
        ? configuration.combosError
        : configuration.addOnsError;
    const canConfirmConfiguration = configuredProduct?.productType === "combo"
        ? !configuration.combosPending && !configuration.combosError && Boolean(configuredCombo) && isComboConfigurationValid(configuredChoiceGroups, selectedComboSelections)
        : Boolean(configuredProduct) && !configuration.addOnsPending && !configuration.addOnsError;

    useEffect(
        () => () => {
            if (scanUnlockTimer.current) {
                clearTimeout(scanUnlockTimer.current);
            }
        },
        [],
    );

    const openScanner = async () => {
        setScanFeedback(null);
        if (!cameraPermission?.granted) {
            const permission = await requestCameraPermission();
            if (!permission.granted) {
                setScanFeedback("scannerPermissionDenied");
                return;
            }
        }

        setShowScanner(true);
    };

    const closeScanner = () => {
        setShowScanner(false);
        setScanLocked(false);
        setScanFeedback(null);
    };

    const resetConfiguration = () => {
        setConfiguredProductId(null);
        setAddOnQuantities({});
        setComboQuantities({});
        setComboAddOnQuantities({});
    };

    const openConfiguration = (product: (typeof catalog.products)[number]) => {
        setScanFeedback(null);
        setAddOnQuantities({});
        setComboQuantities({});
        setComboAddOnQuantities({});
        setConfiguredProductId(product.id);
    };

    const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
        const normalizedData = normalizePosBarcodeData(data);
        const now = Date.now();
        if (
            !shouldAcceptPosBarcodeScan({
                data: normalizedData,
                lastAcceptedData: lastAcceptedScan.current.data,
                lastAcceptedAt: lastAcceptedScan.current.at,
                now,
            })
        ) {
            return;
        }

        lastAcceptedScan.current = { data: normalizedData, at: now };
        setScanLocked(true);
        if (scanUnlockTimer.current) {
            clearTimeout(scanUnlockTimer.current);
        }
        scanUnlockTimer.current = setTimeout(() => setScanLocked(false), POS_BARCODE_SCAN_COOLDOWN_MS);

        const resolution = resolvePosProductCode(normalizedData, catalog.products);
        if (resolution.kind === "unknown") {
            setSearch(resolution.productCode);
            setScanFeedback("scannerUnknownCode");
            return;
        }

        if (resolution.kind === "ambiguous") {
            setSearch(resolution.productCode);
            setScanFeedback("scannerAmbiguousCode");
            return;
        }

        if (resolution.product.productType === "combo") {
            setShowScanner(false);
            openConfiguration(resolution.product);
            return;
        }

        if (resolution.product.productType === "single" && (
            configuration.addOnsPending ||
            configuration.addOnsError ||
            getActiveProductAddOns(configuration.attachments, resolution.product.id).length > 0
        )) {
            setShowScanner(false);
            openConfiguration(resolution.product);
            return;
        }

        if (resolution.product.productType !== "single") {
            setScanFeedback("scannerConfigurationComingSoon");
            return;
        }

        cart.addProduct(resolution.product);
        convenience.recordRecent(resolution.product.id);
        setScanFeedback("scannerAdded");
    };

    const addProduct = (product: (typeof catalog.products)[number]) => {
        if (product.productType !== "single") {
            return;
        }

        cart.addProduct(product);
        convenience.recordRecent(product.id);
    };

    const handleProductPress = (product: (typeof catalog.products)[number]) => {
        const productAddOns = getActiveProductAddOns(configuration.attachments, product.id);
        const productCombo = configuration.combos.find((combo) => combo.product.id === product.id);
        if (product.productType === "single" && !configuration.addOnsPending && !configuration.addOnsError && productAddOns.length === 0) {
            addProduct(product);
            return;
        }

        if (product.productType === "combo" && productCombo && getActiveChoiceGroups(productCombo.choiceGroups).length === 0) {
            cart.addConfiguredProduct(product, { addOns: [], comboSelections: [] });
            convenience.recordRecent(product.id);
            return;
        }

        openConfiguration(product);
    };

    const updateAddOnQuantity = (addOnId: string, cap: number, delta: number) => {
        setAddOnQuantities((current) => ({
            ...current,
            [addOnId]: clampSelectionQuantity(current[addOnId] ?? 0, delta, cap),
        }));
    };

    const updateComboQuantity = (groupId: string, optionProductId: string, optionCap: number, delta: number) => {
        const group = configuredChoiceGroups.find((candidate) => candidate.id === groupId);
        if (!group) {
            return;
        }

        const key = `${groupId}:${optionProductId}`;
        const current = comboQuantities[key] ?? 0;
        const currentGroupCount = countGroupSelections(
            Object.entries(comboQuantities).map(([selectionKey, quantity]) => {
                const [selectionGroupId, selectionOptionProductId] = selectionKey.split(":");
                return { groupId: selectionGroupId!, optionProductId: selectionOptionProductId!, quantity };
            }),
            groupId,
        );
        const groupRemaining = Math.max(0, group.maxSelections - currentGroupCount);
        const cap = delta > 0 ? Math.min(optionCap, current + groupRemaining) : optionCap;
        setComboQuantities((state) => ({
            ...state,
            [key]: clampSelectionQuantity(current, delta, cap),
        }));
    };

    const updateComboAddOnQuantity = (key: string, cap: number, delta: number) => {
        setComboAddOnQuantities((current) => ({
            ...current,
            [key]: clampSelectionQuantity(current[key] ?? 0, delta, cap),
        }));
    };

    const confirmConfiguration = () => {
        if (!configuredProduct || !canConfirmConfiguration) {
            return;
        }

        const cartConfiguration: PosCartConfiguration = {
            addOns: configuredAddOns.flatMap((attachment) => {
                const quantity = addOnQuantities[attachment.addOnId] ?? 0;
                return quantity > 0 ? [{ addOnId: attachment.addOnId, quantity }] : [];
            }),
            comboSelections: selectedComboSelections,
        };
        cart.addConfiguredProduct(configuredProduct, cartConfiguration);
        convenience.recordRecent(configuredProduct.id);
        resetConfiguration();
    };

    const renderProductCard = (product: (typeof catalog.products)[number]) => {
        const hasAddOns = getActiveProductAddOns(configuration.attachments, product.id).length > 0;
        const isInteractive = product.productType === "single" || product.productType === "combo";
        const quantity = cart.items.find((item) => item.id === product.id)?.quantity ?? 0;
        const price = Math.max(0, Number(product.price) - Number(product.discount ?? 0));
        const isPinned = convenience.isPinned(product.id);

        return (
            <View
                key={product.id}
                className="min-h-16 flex-row items-center gap-2 rounded-2xl border border-pos-border bg-pos-surface-muted px-2 py-2 dark:border-pos-border-dark dark:bg-pos-surface-muted-dark"
            >
                <Pressable
                    className="min-w-0 flex-1 flex-row items-center justify-between gap-3 px-2 py-1"
                    disabled={!isInteractive}
                    onPress={() => handleProductPress(product)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !isInteractive }}
                >
                    <View className="min-w-0 flex-1 gap-1">
                        <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{product.name}</Text>
                        <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">
                            {new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(price)}
                        </Text>
                        {!isInteractive ? (
                            <Text className="text-xs text-pos-warning dark:text-pos-warning-dark">{t("configurationComingSoon")}</Text>
                        ) : null}
                        {isInteractive && (hasAddOns || product.productType === "combo") ? (
                            <Text className="text-xs text-pos-primary">{t("configureProduct")}</Text>
                        ) : null}
                    </View>
                    {quantity > 0 ? (
                        <Text className="rounded-full bg-pos-primary px-3 py-1 text-sm font-bold text-pos-primary-foreground">
                            {quantity}
                        </Text>
                    ) : null}
                </Pressable>
                <Pressable
                    className="min-h-12 min-w-12 items-center justify-center rounded-xl bg-pos-surface dark:bg-pos-surface-dark"
                    onPress={() => convenience.togglePinned(product.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t(isPinned ? "unpinProduct" : "pinProduct")}
                >
                    <Text className="text-2xl text-pos-primary">{isPinned ? "★" : "☆"}</Text>
                </Pressable>
            </View>
        );
    };

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <View className="gap-2">
                <Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">{t("newSale")}</Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">{t("newSaleSubtitle")}</Text>
            </View>
            <PosCard>
                <View className="flex-row items-end gap-3">
                    <View className="min-w-0 flex-1">
                        <PosTextField
                            label={t("productSearch")}
                            value={search}
                            onChangeText={setSearch}
                            placeholder={t("searchProductsPlaceholder")}
                            autoCapitalize="none"
                        />
                    </View>
                    <View className="w-32">
                        <PosButton label={t("scanBarcode")} variant="secondary" onPress={openScanner} />
                    </View>
                </View>
                {showScanner ? (
                    <View className="gap-3">
                        <CameraView
                            style={{ height: 240, width: "100%", borderRadius: 20, overflow: "hidden" }}
                            facing="back"
                            mode="picture"
                            barcodeScannerSettings={{
                                barcodeTypes: [
                                    "ean13",
                                    "ean8",
                                    "upc_a",
                                    "upc_e",
                                    "code128",
                                    "code39",
                                    "code93",
                                    "itf14",
                                    "codabar",
                                    "qr",
                                ],
                            }}
                            onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
                            onMountError={() => {
                                setShowScanner(false);
                                setScanFeedback("scannerCameraError");
                            }}
                        />
                        <PosButton label={t("closeScanner")} variant="secondary" onPress={closeScanner} />
                    </View>
                ) : null}
                {scanFeedback ? (
                    <Text className="text-sm leading-5 text-pos-muted dark:text-pos-muted-dark">{t(scanFeedback)}</Text>
                ) : null}
                {configuredProduct ? (
                    <View className="gap-3 rounded-2xl border border-pos-primary/30 bg-pos-primary/5 p-4">
                        <View className="gap-1">
                            <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                                {t("configureProduct")}: {configuredProduct.name}
                            </Text>
                            <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("configurationRequired")}</Text>
                        </View>
                        {configurationPending ? (
                            <View className="flex-row items-center gap-2">
                                <ActivityIndicator />
                                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("configurationLoading")}</Text>
                            </View>
                        ) : null}
                        {configurationError ? (
                            <View className="gap-2">
                                <Text className="text-sm text-pos-danger dark:text-pos-danger-dark">{t("configurationLoadFailed")}</Text>
                                <PosButton label={t("retry", { ns: "common" })} variant="secondary" onPress={configuration.retry} />
                            </View>
                        ) : null}
                        {!configurationPending && !configurationError && configuredProduct.productType === "combo" ? (
                            configuredChoiceGroups.length === 0 ? (
                                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("noConfigurationOptions")}</Text>
                            ) : (
                                configuredChoiceGroups.map((group) => {
                                    const groupSelections = countGroupSelections(selectedComboSelections, group.id);
                                    return (
                                        <View key={group.id} className="gap-2">
                                            <View className="flex-row items-center justify-between gap-2">
                                                <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{group.name}</Text>
                                                <Text className="text-xs text-pos-muted dark:text-pos-muted-dark">
                                                    {groupSelections}/{group.maxSelections}
                                                </Text>
                                            </View>
                                            {group.options.map((option) => {
                                                const key = `${group.id}:${option.optionProductId}`;
                                                const quantity = comboQuantities[key] ?? 0;
                                                const optionAddOns = getActiveProductAddOns(configuration.attachments, option.optionProductId);
                                                return (
                                                    <View key={option.id} className="gap-2 rounded-xl bg-pos-surface px-3 py-2 dark:bg-pos-surface-dark">
                                                        <View className="flex-row items-center justify-between gap-2">
                                                            <Text className="min-w-0 flex-1 text-sm text-pos-foreground dark:text-pos-foreground-dark">{option.product.name}</Text>
                                                            <View className="flex-row items-center gap-1">
                                                                <PosButton
                                                                    label="−"
                                                                    variant="secondary"
                                                                    disabled={quantity === 0}
                                                                    onPress={() => updateComboQuantity(group.id, option.optionProductId, option.maxQuantity, -1)}
                                                                />
                                                                <Text className="w-6 text-center text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{quantity}</Text>
                                                                <PosButton
                                                                    label="+"
                                                                    variant="secondary"
                                                                    disabled={quantity >= option.maxQuantity || groupSelections >= group.maxSelections}
                                                                    onPress={() => updateComboQuantity(group.id, option.optionProductId, option.maxQuantity, 1)}
                                                                />
                                                            </View>
                                                        </View>
                                                        {quantity > 0 ? optionAddOns.map((attachment) => {
                                                            const addOnKey = `${group.id}:${option.optionProductId}:${attachment.addOnId}`;
                                                            const addOnQuantity = comboAddOnQuantities[addOnKey] ?? 0;
                                                            return (
                                                                <View key={attachment.id} className="flex-row items-center justify-between gap-2 border-t border-pos-border pt-2 dark:border-pos-border-dark">
                                                                    <Text className="min-w-0 flex-1 text-xs text-pos-muted dark:text-pos-muted-dark">+ {attachment.addOn.name}</Text>
                                                                    <View className="flex-row items-center gap-1">
                                                                        <PosButton label="−" variant="secondary" disabled={addOnQuantity === 0} onPress={() => updateComboAddOnQuantity(addOnKey, attachment.selectionCap, -1)} />
                                                                        <Text className="w-6 text-center text-xs text-pos-foreground dark:text-pos-foreground-dark">{addOnQuantity}</Text>
                                                                        <PosButton label="+" variant="secondary" disabled={addOnQuantity >= attachment.selectionCap} onPress={() => updateComboAddOnQuantity(addOnKey, attachment.selectionCap, 1)} />
                                                                    </View>
                                                                </View>
                                                            );
                                                        }) : null}
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    );
                                })
                            )
                        ) : null}
                        {!configurationPending && !configurationError && configuredProduct.productType === "single" ? (
                            configuredAddOns.length === 0 ? (
                                <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">{t("noConfigurationOptions")}</Text>
                            ) : (
                                configuredAddOns.map((attachment) => {
                                    const quantity = addOnQuantities[attachment.addOnId] ?? 0;
                                    return (
                                        <View key={attachment.id} className="flex-row items-center justify-between gap-2 rounded-xl bg-pos-surface px-3 py-2 dark:bg-pos-surface-dark">
                                            <Text className="min-w-0 flex-1 text-sm text-pos-foreground dark:text-pos-foreground-dark">{attachment.addOn.name}</Text>
                                            <View className="flex-row items-center gap-1">
                                                <PosButton label="−" variant="secondary" disabled={quantity === 0} onPress={() => updateAddOnQuantity(attachment.addOnId, attachment.selectionCap, -1)} />
                                                <Text className="w-6 text-center text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{quantity}</Text>
                                                <PosButton label="+" variant="secondary" disabled={quantity >= attachment.selectionCap} onPress={() => updateAddOnQuantity(attachment.addOnId, attachment.selectionCap, 1)} />
                                            </View>
                                        </View>
                                    );
                                })
                            )
                        ) : null}
                        <View className="flex-row gap-3">
                            <View className="min-w-0 flex-1"><PosButton label={t("cancelConfiguration")} variant="secondary" onPress={resetConfiguration} /></View>
                            <View className="min-w-0 flex-1"><PosButton label={t("addConfiguredProduct")} disabled={!canConfirmConfiguration} onPress={confirmConfiguration} /></View>
                        </View>
                    </View>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                    <PosButton
                        label={t("allProducts")}
                        variant={productQuickFilter === "all" ? "primary" : "secondary"}
                        onPress={() => setProductQuickFilter("all")}
                    />
                    <PosButton
                        label={t("recentProducts")}
                        variant={productQuickFilter === "recent" ? "primary" : "secondary"}
                        onPress={() => setProductQuickFilter("recent")}
                    />
                    <PosButton
                        label={t("pinnedProducts")}
                        variant={productQuickFilter === "pinned" ? "primary" : "secondary"}
                        onPress={() => setProductQuickFilter("pinned")}
                    />
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                    <PosButton
                        label={t("allCategories")}
                        variant={selectedCategoryId === null ? "primary" : "secondary"}
                        onPress={() => setSelectedCategoryId(null)}
                    />
                    {catalog.categories.map((category) => (
                        <PosButton
                            key={category.id}
                            label={category.name}
                            variant={selectedCategoryId === category.id ? "primary" : "secondary"}
                            onPress={() => setSelectedCategoryId(category.id)}
                        />
                    ))}
                </ScrollView>
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
                    <View className="gap-3">
                        {recentProducts.length > 0 ? (
                            <View className="gap-2">
                                <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">{t("recentProducts")}</Text>
                                <View className="gap-3">{recentProducts.map(renderProductCard)}</View>
                            </View>
                        ) : null}
                        {filteredProducts.length === 0 ? (
                            <Text className="text-sm leading-5 text-pos-muted dark:text-pos-muted-dark">{t("noProductsFound")}</Text>
                        ) : (
                            filteredProducts.map(renderProductCard)
                        )}
                    </View>
                ) : null}
            </PosCard>
            <PosButton
                label={t("cartWithCount", { count: cart.itemCount })}
                onPress={() => navigation.navigate("Cart")}
            />
        </ScrollView>
    );
};

export default NewSaleScreen;
