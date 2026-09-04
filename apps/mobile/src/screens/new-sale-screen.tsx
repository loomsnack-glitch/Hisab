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

type NewSaleScreenProps = NativeStackScreenProps<PosStackParamList, "NewSale">;
type ProductQuickFilter = "all" | "recent" | "pinned";

const NewSaleScreen = ({ navigation }: NewSaleScreenProps) => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation("pos");
    const [search, setSearch] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [productQuickFilter, setProductQuickFilter] = useState<ProductQuickFilter>("all");
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

    const renderProductCard = (product: (typeof catalog.products)[number]) => {
        const isAddable = product.productType === "single";
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
                    disabled={!isAddable}
                    onPress={() => addProduct(product)}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !isAddable }}
                >
                    <View className="min-w-0 flex-1 gap-1">
                        <Text className="text-base font-semibold text-pos-foreground dark:text-pos-foreground-dark">{product.name}</Text>
                        <Text className="text-sm text-pos-muted dark:text-pos-muted-dark">
                            {new Intl.NumberFormat(undefined, { style: "currency", currency: "INR" }).format(price)}
                        </Text>
                        {!isAddable ? (
                            <Text className="text-xs text-pos-warning dark:text-pos-warning-dark">{t("configurationComingSoon")}</Text>
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
