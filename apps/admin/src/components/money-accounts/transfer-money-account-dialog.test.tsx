import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MoneyAccountDTO } from "@repo/types";

import TransferMoneyAccountDialog, {
    TransferMoneyAccountForm,
} from "@/components/money-accounts/transfer-money-account-dialog";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const vesuStoreId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const now = new Date("2026-08-31T12:00:00.000Z");

const sourceAccount: MoneyAccountDTO = {
    id: "11111111-1111-4111-8111-111111111111",
    organizationId,
    name: "Adajan cash",
    type: "cash",
    scope: "store_scoped",
    storeId,
    notes: null,
    status: "active",
    openingBalance: 100,
    balance: 100,
    hasMovements: true,
    createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
};

const hdfcAccount: MoneyAccountDTO = {
    ...sourceAccount,
    id: "33333333-3333-4333-8333-333333333333",
    name: "HDFC Current",
    type: "bank",
    scope: "organization_wide",
    storeId: null,
    openingBalance: 80,
    balance: 80,
};

const vesuAccount: MoneyAccountDTO = {
    ...sourceAccount,
    id: "77777777-7777-4777-8777-777777777777",
    name: "Vesu UPI QR",
    type: "upi",
    scope: "store_scoped",
    storeId: vesuStoreId,
    openingBalance: 20,
    balance: 20,
};

const inactiveAccount: MoneyAccountDTO = {
    ...hdfcAccount,
    id: "22222222-2222-4222-8222-222222222222",
    name: "Office petty cash",
    type: "petty_cash",
    status: "inactive",
};

const renderDialog = () => {
    const queryClient = new QueryClient();
    return renderToStaticMarkup(
        <QueryClientProvider client={queryClient}>
            <TransferMoneyAccountDialog organizationId={organizationId} moneyAccount={sourceAccount} />
        </QueryClientProvider>,
    );
};

const renderForm = (
    destinationAccounts: MoneyAccountDTO[],
    defaultValues?: Partial<{ destinationMoneyAccountId: string; amount: number; note: string }>,
) =>
    renderToStaticMarkup(
        <TransferMoneyAccountForm
            moneyAccount={sourceAccount}
            destinationAccounts={destinationAccounts}
            storeNameById={{ [storeId]: "Adajan", [vesuStoreId]: "Vesu" }}
            defaultValues={defaultValues}
            onSubmit={() => undefined}
        />,
    );

describe("Transfer Money Account dialog", () => {
    test("exposes Transfer money without Add money or Adjust balance", () => {
        const markup = renderDialog();

        expect(markup).toContain("Transfer money");
        expect(markup).toContain("data-slot=\"dialog-trigger\"");
        expect(markup).not.toContain("Add money");
        expect(markup).not.toContain("Withdraw money");
        expect(markup).not.toContain("Adjust balance");
    });

    test("shows source, destination picker, amount, optional note, and a review of both effects", () => {
        const markup = renderForm([hdfcAccount, vesuAccount], {
            destinationMoneyAccountId: hdfcAccount.id,
            amount: 40,
            note: "Cash to bank",
        });

        expect(markup).toContain("From Adajan cash");
        expect(markup).toContain("₹100.00");
        expect(markup).toContain("Destination");
        expect(markup).toContain("HDFC Current · Every store");
        expect(markup).toContain("Vesu UPI QR · Vesu");
        expect(markup).not.toContain("Office petty cash");
        expect(markup).toContain("Amount");
        expect(markup).toContain("Note");
        expect(markup).toContain("Review");
        expect(markup).toContain("−₹40.00");
        expect(markup).toContain("text-destructive");
        expect(markup).toContain("+₹40.00");
        expect(markup).toContain("text-emerald-600");
        expect(markup).toContain("Transfer money");
        expect(markup).not.toContain('type="submit" tabindex="0" data-slot="button" disabled');
    });

    test("disables submit and explains when no other active Money Accounts are available", () => {
        const markup = renderForm([]);

        expect(markup).toContain("No other active Money Accounts are available to transfer to.");
        expect(markup).toContain("Enter an amount to review both sides of the transfer.");
        expect(markup).toContain("disabled");
    });

    test("excludes the source Money Account and inactive accounts from the destination picker", () => {
        const markup = renderForm([sourceAccount, hdfcAccount, vesuAccount, inactiveAccount], {
            destinationMoneyAccountId: hdfcAccount.id,
        });

        expect(markup).toContain("HDFC Current · Every store");
        expect(markup).toContain("Vesu UPI QR · Vesu");
        expect(markup).not.toContain("Office petty cash");
        expect(markup).not.toContain(`value="${sourceAccount.id}"`);
    });
});
