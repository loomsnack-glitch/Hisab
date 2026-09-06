import { useCallback, useState } from "react";
import { getPosPrinterSelection, setPosPrinterSelection } from "../lib/pos-printer-storage";
import {
    buildPosPrinterPayload,
    initialPosPrinter,
    POS_PRINTER_TEST_RECEIPT,
    transitionPosPrinter,
    type PosPrinterDevice,
    type PosPrinterSelection,
    type PosPrinterSnapshot,
} from "../lib/pos-printer-boundary";
import { nativePosPrinterTransport, type PosPrinterTransport } from "../lib/pos-printer-transport";

export const usePosPrinter = (transport: PosPrinterTransport = nativePosPrinterTransport) => {
    const [snapshot, setSnapshot] = useState<PosPrinterSnapshot>(() => ({ ...initialPosPrinter, selected: getPosPrinterSelection() }));
    const transition = useCallback((event: Parameters<typeof transitionPosPrinter>[1]) => {
        setSnapshot((current) => transitionPosPrinter(current, event));
    }, []);
    const fail = useCallback((error: unknown) => {
        transition({ type: "ACTION_FAILED", message: error instanceof Error ? error.message : "Printer action failed" });
    }, [transition]);

    const discover = useCallback(async () => {
        transition({ type: "DISCOVER_STARTED" });
        try {
            const devices = await transport.discover();
            transition({ type: "DISCOVER_SUCCEEDED", devices });
        } catch (error) {
            fail(error);
        }
    }, [fail, transition, transport]);
    const select = useCallback((printer: PosPrinterDevice) => {
        const selected: PosPrinterSelection = { id: printer.id, name: printer.name };
        setPosPrinterSelection(selected);
        setSnapshot((current) => ({ ...current, selected, message: null }));
    }, []);
    const connect = useCallback(async () => {
        if (!snapshot.selected) return;
        transition({ type: "CONNECT_STARTED" });
        try {
            await transport.connect(snapshot.selected);
            transition({ type: "CONNECTED" });
        } catch (error) {
            fail(error);
        }
    }, [fail, snapshot.selected, transition, transport]);
    const disconnect = useCallback(async () => {
        if (!snapshot.selected) return;
        try {
            await transport.disconnect(snapshot.selected);
            transition({ type: "DISCONNECT" });
        } catch (error) {
            fail(error);
        }
    }, [fail, snapshot.selected, transition, transport]);
    const write = useCallback(async (receiptText: string, test = false) => {
        if (!snapshot.selected) return false;
        transition({ type: test ? "TEST_STARTED" : "PRINT_STARTED" });
        try {
            await transport.write(snapshot.selected, buildPosPrinterPayload(receiptText));
            transition({ type: "CONNECTED" });
            return true;
        } catch (error) {
            fail(error);
            return false;
        }
    }, [fail, snapshot.selected, transition, transport]);
    const testPrint = useCallback(() => write(POS_PRINTER_TEST_RECEIPT, true), [write]);
    const printReceipt = useCallback((receiptText: string) => write(receiptText), [write]);
    const retry = useCallback(() => snapshot.selected ? connect() : discover(), [connect, discover, snapshot.selected]);

    return { ...snapshot, discover, select, connect, disconnect, testPrint, printReceipt, retry };
};
