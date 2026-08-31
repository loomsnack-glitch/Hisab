import type { MoneyAccountDTO, MoneyAccountPaymentRouteDTO } from "@repo/types";

export type TrackingMethodReadiness =
    | { state: "ready"; accountName: string }
    | { state: "missing" }
    | { state: "inactive_destination"; accountName: string };

export type StoreMoneyAccountTrackingReadiness = {
    cash: TrackingMethodReadiness;
    upi: TrackingMethodReadiness;
    card: TrackingMethodReadiness;
};

const methodReadiness = (
    method: "upi" | "card",
    accounts: MoneyAccountDTO[],
    routes: MoneyAccountPaymentRouteDTO[],
): TrackingMethodReadiness => {
    const route = routes.find((current) => current.paymentMethod === method);
    if (!route) {
        return { state: "missing" };
    }

    const destination = accounts.find((account) => account.id === route.moneyAccountId);
    if (!destination || destination.status !== "active") {
        return {
            state: "inactive_destination",
            accountName: destination?.name ?? "Money Account",
        };
    }

    return { state: "ready", accountName: destination.name };
};

export const getStoreMoneyAccountTrackingReadiness = (
    storeId: string,
    accounts: MoneyAccountDTO[],
    routes: MoneyAccountPaymentRouteDTO[],
): StoreMoneyAccountTrackingReadiness => {
    const cashAccount = accounts.find(
        (account) =>
            account.type === "cash"
            && account.status === "active"
            && account.storeId === storeId,
    );

    return {
        cash: cashAccount
            ? { state: "ready", accountName: cashAccount.name }
            : { state: "missing" },
        upi: methodReadiness("upi", accounts, routes),
        card: methodReadiness("card", accounts, routes),
    };
};
