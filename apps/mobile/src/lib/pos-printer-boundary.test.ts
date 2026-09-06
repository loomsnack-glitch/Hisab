import { describe, expect, it } from "bun:test";
import {
    buildPosPrinterPayload,
    initialPosPrinter,
    parsePosPrinterSelection,
    serializePosPrinterSelection,
    transitionPosPrinter,
} from "./pos-printer-boundary";

describe("POS printer boundary", () => {
    it("models discovery, connection, testing, printing, disconnect, and failure states", () => {
        const discovered = transitionPosPrinter(initialPosPrinter, { type: "DISCOVER_SUCCEEDED", devices: [{ id: "p1", name: "Counter Printer" }] });
        expect(discovered.status).toBe("disconnected");
        expect(transitionPosPrinter(discovered, { type: "CONNECT_STARTED" }).status).toBe("connecting");
        expect(transitionPosPrinter(discovered, { type: "CONNECTED" }).status).toBe("connected");
        expect(transitionPosPrinter(discovered, { type: "TEST_STARTED" }).status).toBe("testing");
        expect(transitionPosPrinter(discovered, { type: "PRINT_STARTED" }).status).toBe("printing");
        expect(transitionPosPrinter(discovered, { type: "ACTION_FAILED", message: "Disconnected" })).toMatchObject({ status: "failed", message: "Disconnected" });
        expect(transitionPosPrinter(discovered, { type: "DISCONNECT" }).status).toBe("disconnected");
    });

    it("round-trips a safe selected-printer preference and rejects malformed data", () => {
        const selection = { id: "p1", name: "Counter Printer" };
        expect(parsePosPrinterSelection(serializePosPrinterSelection(selection))).toEqual(selection);
        expect(parsePosPrinterSelection(null)).toBeNull();
        expect(parsePosPrinterSelection("not-json")).toBeNull();
        expect(parsePosPrinterSelection(JSON.stringify({ id: "p1" }))).toBeNull();
    });

    it("keeps the receipt payload separate from the Bluetooth transport", () => {
        expect(buildPosPrinterPayload("Receipt\n")).toBe("\x1b@Receipt\n\x1dV\x00");
    });
});
