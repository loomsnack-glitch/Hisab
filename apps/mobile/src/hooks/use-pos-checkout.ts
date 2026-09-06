import * as Crypto from "expo-crypto";
import { useState } from "react";
import { usePosCart } from "./use-pos-cart";
import { usePosPayments } from "./use-pos-payments";
import { createPosCheckoutOperation, executePosCheckout, resolvePosCheckoutRequestId } from "../lib/pos-checkout-boundary";
import { clearPosPayments } from "../store/pos-payment.store";

export const usePosCheckout = () => {
    const cart = usePosCart();
    const payments = usePosPayments(cart.displayTotals.total);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const checkout = async () => {
        if (pending) {
            return null;
        }

        if (cart.items.length === 0) {
            const nextError = new Error("Add at least one Product before completing the Sale");
            setError(nextError);
            throw nextError;
        }

        if (payments.validation.kind !== "valid") {
            const nextError = new Error(
                payments.validation.kind === "over_total"
                    ? "Collected amount cannot exceed the Sale total"
                    : "Enter valid Payment amounts",
            );
            setError(nextError);
            throw nextError;
        }

        const requestId = resolvePosCheckoutRequestId(cart.completionRequestId, Crypto.randomUUID);
        cart.setCompletionRequestId(requestId);
        setPending(true);
        setError(null);

        try {
            const sale = await executePosCheckout(createPosCheckoutOperation({
                draftSaleId: cart.draftSaleId,
                items: cart.items,
                customer: cart.customer,
                discount: cart.discount,
                payments: payments.rows,
                requestId,
                serviceMode: cart.serviceMode,
            }));
            cart.clear();
            clearPosPayments();
            return sale;
        } catch (checkoutError) {
            const nextError = checkoutError instanceof Error ? checkoutError : new Error("Unable to complete the Sale");
            setError(nextError);
            throw nextError;
        } finally {
            setPending(false);
        }
    };

    return { checkout, pending, error };
};
