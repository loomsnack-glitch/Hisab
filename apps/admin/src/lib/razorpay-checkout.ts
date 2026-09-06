export type RazorpayCheckoutRequest = {
    keyId: string;
    orderId: string;
    amountPaise: number;
    currency: "INR";
    description: string;
};

export type RazorpayCheckoutResult =
    | { outcome: "browser-success" }
    | { outcome: "dismissed" }
    | { outcome: "failed"; message: string };

export type OpenRazorpayCheckout = (request: RazorpayCheckoutRequest) => Promise<RazorpayCheckoutResult>;

type RazorpayConstructor = new (options: {
    key: string;
    order_id: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    handler: () => void;
    modal?: { ondismiss?: () => void };
}) => { open: () => void };

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

const loadCheckoutScript = async (): Promise<RazorpayConstructor> => {
    const existing = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
    if (existing) {
        return existing;
    }

    await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = CHECKOUT_SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Unable to open Razorpay Checkout"));
        document.head.appendChild(script);
    });

    const loaded = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
    if (!loaded) {
        throw new Error("Unable to open Razorpay Checkout");
    }
    return loaded;
};

export const openRazorpayCheckout: OpenRazorpayCheckout = async (request) => {
    const Razorpay = await loadCheckoutScript();
    return new Promise<RazorpayCheckoutResult>((resolve) => {
        const checkout = new Razorpay({
            key: request.keyId,
            order_id: request.orderId,
            amount: request.amountPaise,
            currency: request.currency,
            name: "Ganatri",
            description: request.description,
            handler: () => resolve({ outcome: "browser-success" }),
            modal: {
                ondismiss: () => resolve({ outcome: "dismissed" }),
            },
        });
        checkout.open();
    });
};
