import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import PosPrinterPage from "@/pages/pos-printer-page";
import { PosPrinterProvider } from "@/providers/pos-printer-provider";

describe("POS printer settings page", () => {
    test("registers a Printer route and keeps the navbar printer icon as settings only", () => {
        const appSource = readFileSync(join(import.meta.dir, "../App.tsx"), "utf8");
        const layoutSource = readFileSync(join(import.meta.dir, "../components/pos/pos-layout.tsx"), "utf8");

        expect(appSource).toContain('path="printer"');
        expect(appSource).toContain("<PosPrinterPage />");
        expect(layoutSource).toContain('aria-label="Printer settings"');
        expect(layoutSource).toContain('navigate("/printer")');
        expect(layoutSource).toContain("Reconnect receipt printer");
        expect(layoutSource).toContain("needsBluetoothReconnectTap");
        expect(layoutSource).not.toContain("Receipt paper size");
        expect(layoutSource).not.toContain("Connect receipt printer");
        expect(layoutSource).not.toContain("58mm");
        expect(layoutSource).not.toContain("80mm");
    });

    test("lists USB, Bluetooth, and COM connection options with paper width", () => {
        const markup = renderToStaticMarkup(
            <PosPrinterProvider>
                <PosPrinterPage />
            </PosPrinterProvider>,
        );

        expect(markup).toContain("Printer");
        expect(markup).toContain("USB");
        expect(markup).toContain("Bluetooth");
        expect(markup).toContain("COM port");
        expect(markup).toContain("Receipt paper");
        expect(markup).toContain("58 mm");
        expect(markup).toContain("80 mm");
        expect(markup).not.toContain("Bluetooth COM ports will not print receipts");
    });
});
