import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MoneyAccountDTO } from "@repo/types";

import AdjustMoneyAccountBalanceDialog, {
    AdjustMoneyAccountBalanceForm,
} from "@/components/money-accounts/adjust-money-account-balance-dialog";

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

const renderDialog = () => {
    const queryClient = new QueryClient();
    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <AdjustMoneyAccountBalanceDialog organizationId={organizationId} moneyAccount={moneyAccount} />
        </QueryClientProvider>,
    );
};

const renderForm = (defaultValues?: { actualBalance?: number; reason?: string }) =>
    renderToStaticMarkup(
        <AdjustMoneyAccountBalanceForm
            moneyAccount={moneyAccount}
            defaultValues={defaultValues}
            onSubmit={() => undefined}
        />,
    );

describe("Adjust Money Account Balance dialog", () => {
    test("exposes Adjust balance without Transfer money", () => {
        const markup = renderDialog();

        expect(markup).toContain("Adjust balance");
        expect(markup).toContain("data-slot=\"dialog-trigger\"");
        expect(markup).not.toContain("Transfer money");
        expect(markup).not.toContain("Add money");
        expect(markup).not.toContain("Withdraw money");
    });

    test("shows the tracked balance, actual-balance input, derived difference, and required reason", () => {
        const markup = renderForm();

        expect(markup).toContain("Actual balance");
        expect(markup).toContain("Tracked balance");
        expect(markup).toContain("₹350.50");
        expect(markup).toContain("Difference");
        expect(markup).toContain("Enter the counted amount to see the derived adjustment.");
        expect(markup).toContain("Reason");
        expect(markup).toContain("disabled");
    });

    test("shows a gray derived difference when the counted amount differs from the tracked balance", () => {
        const markup = renderForm({
            actualBalance: 320,
            reason: "Missed cash purchase",
        });

        expect(markup).toContain("−₹30.50");
        expect(markup).toContain("text-muted-foreground");
        expect(markup).not.toContain("No adjustment is needed");
        expect(markup).toContain("Adjust balance");
    });

    test("explains that no adjustment is needed when the counted amount matches the tracked balance", () => {
        const markup = renderForm({
            actualBalance: 350.5,
            reason: "Counted the till",
        });

        expect(markup).toContain("No adjustment is needed. The counted amount matches the tracked balance.");
        expect(markup).toContain("disabled");
    });
});
