import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MoneyAccountDTO } from "@repo/types";

import RecordManualMoneyMovementDialog from "@/components/money-accounts/record-manual-money-movement-dialog";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const now = new Date("2026-08-31T12:00:00.000Z");

const moneyAccount: MoneyAccountDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "HDFC Current",
    type: "bank",
    scope: "organization_wide",
    storeId: null,
    notes: null,
    status: "active",
    openingBalance: 100,
    balance: 350.5,
    hasMovements: true,
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const renderDialog = (mode: "deposit" | "withdrawal") => {
    const queryClient = new QueryClient();
    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <RecordManualMoneyMovementDialog
                organizationId={organizationId}
                moneyAccount={moneyAccount}
                mode={mode}
            />
        </QueryClientProvider>,
    );
};

describe("Record Manual Money Movement dialog", () => {
    test("exposes Add money without Adjust balance or Transfer money", () => {
        const markup = renderDialog("deposit");

        expect(markup).toContain("Add money");
        expect(markup).toContain("data-slot=\"dialog-trigger\"");
        expect(markup).not.toContain("Adjust balance");
        expect(markup).not.toContain("Transfer money");
    });

    test("exposes Withdraw money as a distinct action from Add money", () => {
        const markup = renderDialog("withdrawal");

        expect(markup).toContain("Withdraw money");
        expect(markup).toContain("data-slot=\"dialog-trigger\"");
        expect(markup).not.toContain("Add money");
        expect(markup).not.toContain("Adjust balance");
    });
});
