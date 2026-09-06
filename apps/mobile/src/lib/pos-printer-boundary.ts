export type PosPrinterDevice = {
    id: string;
    name: string;
};

export type PosPrinterStatus =
    | "disconnected"
    | "discovering"
    | "connecting"
    | "connected"
    | "testing"
    | "printing"
    | "failed";

export type PosPrinterSelection = PosPrinterDevice;

export type PosPrinterSnapshot = {
    status: PosPrinterStatus;
    devices: PosPrinterDevice[];
    selected: PosPrinterSelection | null;
    message: string | null;
};

export type PosPrinterEvent =
    | { type: "DISCOVER_STARTED" }
    | { type: "DISCOVER_SUCCEEDED"; devices: PosPrinterDevice[] }
    | { type: "CONNECT_STARTED" }
    | { type: "CONNECTED" }
    | { type: "DISCONNECT" }
    | { type: "TEST_STARTED" }
    | { type: "PRINT_STARTED" }
    | { type: "ACTION_FAILED"; message: string };

export const initialPosPrinter: PosPrinterSnapshot = {
    status: "disconnected",
    devices: [],
    selected: null,
    message: null,
};

export const transitionPosPrinter = (
    snapshot: PosPrinterSnapshot,
    event: PosPrinterEvent,
): PosPrinterSnapshot => {
    switch (event.type) {
        case "DISCOVER_STARTED":
            return { ...snapshot, status: "discovering", message: null };
        case "DISCOVER_SUCCEEDED":
            return { ...snapshot, status: "disconnected", devices: event.devices, message: null };
        case "CONNECT_STARTED":
            return { ...snapshot, status: "connecting", message: null };
        case "CONNECTED":
            return { ...snapshot, status: "connected", message: null };
        case "DISCONNECT":
            return { ...snapshot, status: "disconnected", message: null };
        case "TEST_STARTED":
            return { ...snapshot, status: "testing", message: null };
        case "PRINT_STARTED":
            return { ...snapshot, status: "printing", message: null };
        case "ACTION_FAILED":
            return { ...snapshot, status: "failed", message: event.message };
    }
};

export const serializePosPrinterSelection = (selection: PosPrinterSelection) => JSON.stringify(selection);

export const parsePosPrinterSelection = (value: string | null): PosPrinterSelection | null => {
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(value) as Partial<PosPrinterSelection>;
        return typeof parsed.id === "string" && typeof parsed.name === "string"
            ? { id: parsed.id, name: parsed.name }
            : null;
    } catch {
        return null;
    }
};

export const buildPosPrinterPayload = (receiptText: string) => `\x1b@${receiptText.trimEnd()}\n\x1dV\x00`;

export const POS_PRINTER_TEST_RECEIPT = "GANATRI POS\nPRINTER TEST\n";
