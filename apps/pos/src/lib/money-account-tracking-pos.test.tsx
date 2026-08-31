import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import type { PaymentMethod, ServiceTableDTO } from "@repo/types";

import PosServiceTableCard from "@/components/table-service/pos-service-table-card";

const now = new Date("2026-08-31T12:00:00.000Z");
const table: ServiceTableDTO = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    organizationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    storeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    tableLabel: "A1",
    capacity: 4,
    state: "payment_due",
    currentSaleId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    currentTableOrderId: null,
    currentSaleTotal: 90,
    serviceAreaId: null,
    createdBy: "11111111-1111-4111-8111-111111111111",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const idle = () => undefined;

describe("POS Money Account Tracking presentation", () => {
    test("table collection offers Cash, UPI, and Card without Money Account configuration", () => {
        const markup = renderToStaticMarkup(
            <PosServiceTableCard
                table={table}
                paymentTableId={table.id}
                paymentAmount="90"
                paymentMethod={"cash" as PaymentMethod}
                busy={{
                    allocateOrFree: false,
                    opening: false,
                    cancelling: false,
                    releasing: false,
                    collecting: false,
                    anyMutation: false,
                }}
                onAllocateOrFree={idle}
                onStartOrder={idle}
                onOpenOrder={idle}
                onCancelOrder={idle}
                onBeginCollect={idle}
                onSubmitPayment={idle}
                onPaymentAmountChange={idle}
                onPaymentMethodChange={idle}
                onFreeDue={idle}
                onFreePaid={idle}
            />,
        );

        expect(markup).toContain("Cash");
        expect(markup).toContain("UPI");
        expect(markup).toContain("Card");
        expect(markup).toContain("Collect payment");
        expect(markup).not.toContain("Money Account");
        expect(markup).not.toContain("Opening Balance");
        expect(markup).not.toContain("Payment routing");
        expect(markup).not.toContain("Calculated balance");
        expect(markup).not.toContain("Payment Routing Rule");
    });

    test("POS billing surfaces administrator-setup Payment errors without account configuration controls", () => {
        const billingPage = readFileSync(join(import.meta.dir, "..", "pages", "billing-page.tsx"), "utf8");
        const saleDetail = readFileSync(
            join(import.meta.dir, "..", "components", "billing", "sale-detail-dialog.tsx"),
            "utf8",
        );
        const tablesWorkspace = readFileSync(
            join(import.meta.dir, "..", "pages", "pos-tables-workspace.tsx"),
            "utf8",
        );

        expect(saleDetail).toContain("setFormError(response.message");
        expect(saleDetail).toContain("Bank transfer");
        expect(saleDetail).toContain("Other");
        expect(saleDetail).not.toContain("money-accounts");
        expect(saleDetail).not.toContain("Opening Balance");
        expect(saleDetail).not.toContain("Payment routing");

        expect(billingPage).toContain("throw new Error(response.message");
        expect(billingPage).toContain("toast.error(error?.message || \"Failed to complete bill\")");
        expect(billingPage).not.toContain("money-accounts");
        expect(billingPage).not.toContain("Opening Balance");
        expect(billingPage).not.toContain("Payment routing");

        expect(tablesWorkspace).toContain("toast.error(response.message)");
        expect(tablesWorkspace).not.toContain("money-accounts");
        expect(tablesWorkspace).not.toContain("Opening Balance");
        expect(tablesWorkspace).not.toContain("Payment routing");
    });
});
