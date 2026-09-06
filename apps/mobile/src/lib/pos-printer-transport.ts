import { NativeModules } from "react-native";
import type { PosPrinterDevice, PosPrinterSelection } from "./pos-printer-boundary";

type NativeBluetoothPrinter = {
    discover: () => Promise<PosPrinterDevice[]>;
    connect: (printerId: string) => Promise<void>;
    disconnect: (printerId: string) => Promise<void>;
    write: (printerId: string, payload: string) => Promise<void>;
};

export type PosPrinterTransport = {
    discover: () => Promise<PosPrinterDevice[]>;
    connect: (printer: PosPrinterSelection) => Promise<void>;
    disconnect: (printer: PosPrinterSelection) => Promise<void>;
    write: (printer: PosPrinterSelection, payload: string) => Promise<void>;
};

const getNativePrinter = (): NativeBluetoothPrinter => {
    const nativePrinter = NativeModules.GanatriBluetoothPrinter as NativeBluetoothPrinter | undefined;
    if (!nativePrinter) {
        throw new Error("Bluetooth printer native module is unavailable");
    }

    return nativePrinter;
};

export const nativePosPrinterTransport: PosPrinterTransport = {
    discover: async () => getNativePrinter().discover(),
    connect: async (printer) => getNativePrinter().connect(printer.id),
    disconnect: async (printer) => getNativePrinter().disconnect(printer.id),
    write: async (printer, payload) => getNativePrinter().write(printer.id, payload),
};
