import { afterEach, describe, expect, mock, test } from "bun:test";
import { createRef, useRef, useState } from "react";
import { Window } from "happy-dom";
import type { ProductResponseDTO } from "@repo/types";

const globalWithTestDom = globalThis as typeof globalThis & { __hisabTestDomInstalled?: boolean };
if (!globalWithTestDom.__hisabTestDomInstalled) {
    const testWindow = new Window({ url: "http://localhost" });
    const requestAnimationFrame = (callback: FrameRequestCallback) =>
        Number(setTimeout(() => callback(Date.now()), 16));
    const cancelAnimationFrame = (id: number) => clearTimeout(id);

    Object.assign(globalThis, {
        Element: testWindow.Element,
        Event: testWindow.Event,
        document: testWindow.document,
        HTMLElement: testWindow.HTMLElement,
        HTMLInputElement: testWindow.HTMLInputElement,
        Node: testWindow.Node,
        MutationObserver: testWindow.MutationObserver,
        ResizeObserver: testWindow.ResizeObserver,
        getComputedStyle: testWindow.getComputedStyle.bind(testWindow),
        navigator: testWindow.navigator,
        window: testWindow,
        requestAnimationFrame,
        cancelAnimationFrame,
    });
    globalWithTestDom.__hisabTestDomInstalled = true;
}

const { cleanup, fireEvent, render, screen } = await import("@testing-library/react");
const { BillingScanPanel } = await import("./billing-scan-panel");
const { incrementPlainProductQuantity, resolveScanToCartIntent, shouldCaptureDirectBarcodeScan } =
    await import("@/lib/barcode-scanning");
import type { BillingScanFeedback, BillingScanPanelProps } from "./billing-scan-panel";

afterEach(cleanup);

const product = (overrides: Partial<ProductResponseDTO> = {}) =>
    ({
        id: "product-1",
        organizationId: "organization-1",
        categoryId: "category-1",
        name: "Milk",
        price: 42,
        discount: 0,
        imagePath: null,
        imageSignedUrl: null,
        productType: "single",
        productCode: "0012345678905",
        productCodeKind: "manufacturer",
        status: "active",
        createdBy: "user-1",
        updatedBy: null,
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
        ...overrides,
    }) as ProductResponseDTO;

const renderScanPanel = (overrides: Partial<BillingScanPanelProps> = {}) => {
    const scanInputRef = createRef<HTMLInputElement>();
    const props: BillingScanPanelProps = {
        scanInputRef,
        scanValue: "",
        onScanValueChange: mock(() => undefined),
        onSubmitScan: mock(() => undefined),
        directScanEnabled: false,
        directScanPaused: false,
        onToggleDirectScanPaused: mock(() => undefined),
        canEnableDirectScan: true,
        onRequestEnableDirectScan: mock(() => undefined),
        onDisableDirectScan: mock(() => undefined),
        activeProductCodesCount: 3,
        scanFeedback: null,
        onClearScanFeedback: mock(() => undefined),
        onUseTopSearch: mock(() => undefined),
        onSendToAdministrator: mock(() => undefined),
        scanDiagnostics: [],
        onClearDiagnostics: mock(() => undefined),
        ...overrides,
    };

    return { ...render(<BillingScanPanel {...props} />), props, scanInputRef };
};

function ScanFlowHarness({
    products,
    inactiveProductCodes = [],
    hasAddOns = false,
}: {
    products: ProductResponseDTO[];
    inactiveProductCodes?: Array<{ productCode: string; productName: string }>;
    hasAddOns?: boolean;
}) {
    const scanInputRef = useRef<HTMLInputElement | null>(null);
    const [scanValue, setScanValue] = useState("");
    const [scanFeedback, setScanFeedback] = useState<BillingScanFeedback | null>(null);
    const [directScanPaused, setDirectScanPaused] = useState(false);
    const [cart, setCart] = useState<Array<{ key: string; productId: string; quantity: number }>>([]);
    const [customizeProductName, setCustomizeProductName] = useState<string | null>(null);

    return (
        <>
            <BillingScanPanel
                scanInputRef={scanInputRef}
                scanValue={scanValue}
                onScanValueChange={setScanValue}
                onSubmitScan={(value) => {
                    const intent = resolveScanToCartIntent(value, products, inactiveProductCodes, { hasAddOns });
                    if (intent.kind === "empty") {
                        return;
                    }
                    setScanValue("");
                    if (intent.kind === "unknown") {
                        setScanFeedback({ kind: "unknown", productCode: intent.productCode });
                        return;
                    }
                    if (intent.kind === "inactive") {
                        setScanFeedback({
                            kind: "inactive",
                            productCode: intent.productCode,
                            productName: intent.productName,
                        });
                        return;
                    }
                    if (intent.kind === "ambiguous") {
                        setScanFeedback({ kind: "ambiguous", productCode: intent.productCode });
                        return;
                    }
                    if (intent.kind === "unavailable") {
                        setScanFeedback({
                            kind: "unavailable",
                            message: `${intent.product.name} cannot be added right now.`,
                        });
                        return;
                    }
                    if (intent.kind === "customize" || intent.kind === "configure") {
                        setCustomizeProductName(intent.product.name);
                        setScanFeedback({ kind: "success", message: `Choose options for ${intent.product.name}.` });
                        return;
                    }

                    setCart((current) => {
                        const existing = current.find((item) => item.productId === intent.product.id);
                        if (existing) {
                            const next = incrementPlainProductQuantity(current, existing.key) ?? current;
                            const quantity = next.find((item) => item.key === existing.key)?.quantity ?? existing.quantity;
                            setScanFeedback({
                                kind: "success",
                                message: `${intent.product.name} added. Quantity ${quantity}.`,
                            });
                            return next;
                        }

                        setScanFeedback({ kind: "success", message: `${intent.product.name} added. Quantity 1.` });
                        return [{ key: "plain", productId: intent.product.id, quantity: 1 }, ...current];
                    });
                }}
                directScanEnabled
                directScanPaused={directScanPaused}
                onToggleDirectScanPaused={() => setDirectScanPaused((paused) => !paused)}
                canEnableDirectScan
                onRequestEnableDirectScan={() => undefined}
                onDisableDirectScan={() => undefined}
                activeProductCodesCount={products.length}
                scanFeedback={scanFeedback}
                onClearScanFeedback={() => setScanFeedback(null)}
                onUseTopSearch={() => {
                    setScanFeedback(null);
                    setScanValue("");
                }}
                onSendToAdministrator={() => setScanFeedback(null)}
                scanDiagnostics={[]}
                onClearDiagnostics={() => undefined}
            />
            <p data-testid="cart-quantity">{cart.find((item) => item.key === "plain")?.quantity ?? 0}</p>
            <p data-testid="customize-target">{customizeProductName ?? ""}</p>
            <p data-testid="direct-scan-paused">{String(directScanPaused)}</p>
        </>
    );
}

describe("BillingScanPanel", () => {
    test("submits the typed code through the scan field, including a repeated scan", () => {
        const onSubmitScan = mock(() => undefined);
        const onScanValueChange = mock(() => undefined);
        const { scanInputRef } = renderScanPanel({
            scanValue: "0012345678905",
            onScanValueChange,
            onSubmitScan,
        });

        const input = screen.getByPlaceholderText("Scan or type code") as HTMLInputElement;
        expect(input.id).toBe("product-code-scan");
        expect(scanInputRef.current).toBe(input);

        fireEvent.change(input, { target: { value: "0012345678905" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        fireEvent.click(screen.getByRole("button", { name: "Add" }));

        expect(onSubmitScan).toHaveBeenCalledTimes(2);
        expect(onSubmitScan.mock.calls).toEqual([["0012345678905"], ["0012345678905"]]);
    });

    test("offers the top-search fallback for an unknown Product Code", () => {
        const onClearScanFeedback = mock(() => undefined);
        const onUseTopSearch = mock(() => undefined);
        renderScanPanel({
            scanFeedback: { kind: "unknown", productCode: "missing-code" },
            onClearScanFeedback,
            onUseTopSearch,
        });

        expect(screen.getByText(/No Product is linked to/)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Use top search" }));
        expect(onClearScanFeedback).toHaveBeenCalledTimes(1);
        expect(onUseTopSearch).toHaveBeenCalledTimes(1);
    });

    test("sends an unknown Product Code to the administrator linking queue without catalog mutation", () => {
        const onSendToAdministrator = mock(() => undefined);
        renderScanPanel({
            scanFeedback: { kind: "unknown", productCode: "missing-code" },
            onSendToAdministrator,
        });

        fireEvent.click(screen.getByRole("button", { name: "Send to administrator" }));
        expect(onSendToAdministrator).toHaveBeenCalledWith("missing-code");
    });

    test("renders inactive, ambiguous, and configurable success feedback", () => {
        const { rerender, props } = renderScanPanel({
            scanFeedback: { kind: "inactive", productCode: "inactive-code", productName: "Retired milk" },
        });
        expect(screen.getByText(/Retired milk is inactive/)).toBeTruthy();

        rerender(
            <BillingScanPanel
                {...props}
                scanFeedback={{ kind: "ambiguous", productCode: "0012345678905" }}
            />,
        );
        expect(screen.getByText(/conflicting catalog assignments/i)).toBeTruthy();

        rerender(
            <BillingScanPanel
                {...props}
                scanFeedback={{ kind: "success", message: "Choose options for Milk." }}
            />,
        );
        expect(screen.getByText("Choose options for Milk.")).toBeTruthy();
    });

    test("pauses and resumes direct scan ownership from the panel controls", () => {
        const onToggleDirectScanPaused = mock(() => undefined);
        const onRequestEnableDirectScan = mock(() => undefined);
        const { rerender, props } = renderScanPanel({
            directScanEnabled: true,
            directScanPaused: false,
            onToggleDirectScanPaused,
        });

        const pauseButton = screen.getByRole("button", { name: "Pause direct scan" });
        expect(pauseButton.getAttribute("aria-pressed")).toBe("true");
        fireEvent.click(pauseButton);
        expect(onToggleDirectScanPaused).toHaveBeenCalledTimes(1);
        expect(
            shouldCaptureDirectBarcodeScan({
                enabled: true,
                scanFieldOwnsFocus: false,
                unrelatedEditableFieldOwnsFocus: false,
                dialogOwnsFocus: false,
            }),
        ).toBe(true);

        rerender(
            <BillingScanPanel
                {...props}
                directScanEnabled
                directScanPaused
                onToggleDirectScanPaused={onToggleDirectScanPaused}
            />,
        );
        const resumeButton = screen.getByRole("button", { name: "Resume direct scan" });
        expect(resumeButton.getAttribute("aria-pressed")).toBe("false");
        expect(screen.getByText(/Direct scan paused/)).toBeTruthy();

        rerender(
            <BillingScanPanel
                {...props}
                directScanEnabled={false}
                canEnableDirectScan
                onRequestEnableDirectScan={onRequestEnableDirectScan}
            />,
        );
        fireEvent.click(screen.getByRole("button", { name: /Direct/ }));
        expect(onRequestEnableDirectScan).toHaveBeenCalledTimes(1);
        expect(
            shouldCaptureDirectBarcodeScan({
                enabled: false,
                scanFieldOwnsFocus: false,
                unrelatedEditableFieldOwnsFocus: false,
                dialogOwnsFocus: false,
            }),
        ).toBe(false);
        expect(
            shouldCaptureDirectBarcodeScan({
                enabled: true,
                scanFieldOwnsFocus: true,
                unrelatedEditableFieldOwnsFocus: false,
                dialogOwnsFocus: false,
            }),
        ).toBe(false);
    });

    test("wires successful, repeated, unknown, inactive, and configurable scans through the extracted panel", () => {
        render(<ScanFlowHarness products={[product()]} />);

        const input = screen.getByPlaceholderText("Scan or type code");
        fireEvent.change(input, { target: { value: "0012345678905" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        expect(screen.getByText("Milk added. Quantity 1.")).toBeTruthy();
        expect(screen.getByTestId("cart-quantity").textContent).toBe("1");

        fireEvent.change(input, { target: { value: "0012345678905" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        expect(screen.getByText("Milk added. Quantity 2.")).toBeTruthy();
        expect(screen.getByTestId("cart-quantity").textContent).toBe("2");

        fireEvent.click(screen.getByRole("button", { name: "Pause direct scan" }));
        expect(screen.getByTestId("direct-scan-paused").textContent).toBe("true");
        expect(screen.getByRole("button", { name: "Resume direct scan" })).toBeTruthy();
    });

    test("keeps unknown and inactive scans out of the cart and offers manual search", () => {
        render(
            <ScanFlowHarness
                products={[product()]}
                inactiveProductCodes={[{ productCode: "inactive-code", productName: "Retired milk" }]}
            />,
        );

        const input = screen.getByPlaceholderText("Scan or type code");
        fireEvent.change(input, { target: { value: "missing-code" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        expect(screen.getByText(/No Product is linked to/)).toBeTruthy();
        fireEvent.click(screen.getByRole("button", { name: "Use top search" }));
        expect(screen.queryByText(/No Product is linked to/)).toBeNull();

        fireEvent.change(input, { target: { value: "inactive-code" } });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        expect(screen.getByText(/Retired milk is inactive/)).toBeTruthy();
        expect(screen.getByTestId("cart-quantity").textContent).toBe("0");
    });

    test("opens configuration instead of adding a Product that needs options", () => {
        render(<ScanFlowHarness products={[product()]} hasAddOns />);

        fireEvent.change(screen.getByPlaceholderText("Scan or type code"), {
            target: { value: "0012345678905" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Add" }));
        expect(screen.getByText("Choose options for Milk.")).toBeTruthy();
        expect(screen.getByTestId("customize-target").textContent).toBe("Milk");
        expect(screen.getByTestId("cart-quantity").textContent).toBe("0");
    });
});
