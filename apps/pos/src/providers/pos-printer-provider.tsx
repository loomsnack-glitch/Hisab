import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SaleDetailDTO } from "@repo/types";

import {
  build80mmEscPosPayload,
  findRememberedPrinter,
  getRememberedPrinterFilters,
  getUsbPrinter,
  prepareUsbPrinter,
  saveRememberedPrinter,
  type UsbDevice,
} from "@/lib/pos-printer";
import type { ReceiptContext } from "@/lib/receipt-text";

type PosPrinterStatus =
  | "unsupported"
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

type PosPrinterContextValue = {
  supported: boolean;
  connected: boolean;
  status: PosPrinterStatus;
  printerName: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  printSale: (sale: SaleDetailDTO, context?: ReceiptContext) => Promise<void>;
};

const PosPrinterContext = createContext<PosPrinterContextValue | null>(null);

const messageForError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const PosPrinterProvider = ({ children }: { children: ReactNode }) => {
  const usb = getUsbPrinter();
  const deviceRef = useRef<UsbDevice | null>(null);
  const endpointRef = useRef<{
    endpointNumber: number;
    interfaceNumber: number;
  } | null>(null);
  const [status, setStatus] = useState<PosPrinterStatus>(
    usb ? "disconnected" : "unsupported",
  );
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disconnectDevice = useCallback(async () => {
    const device = deviceRef.current;
    const endpoint = endpointRef.current;
    deviceRef.current = null;
    endpointRef.current = null;
    setPrinterName(null);

    if (device && endpoint) {
      await device
        .releaseInterface(endpoint.interfaceNumber)
        .catch(() => undefined);
    }
    if (device?.opened) {
      await device.close().catch(() => undefined);
    }
  }, []);

  const attachDevice = useCallback(async (device: UsbDevice) => {
    const endpoint = await prepareUsbPrinter(device);
    deviceRef.current = device;
    endpointRef.current = endpoint;
    saveRememberedPrinter(device);
    setPrinterName(device.productName || "USB printer");
    setError(null);
    setStatus("connected");
  }, []);

  const connect = useCallback(async () => {
    const manager = getUsbPrinter();
    if (!manager) {
      setStatus("unsupported");
      throw new Error(
        "WebUSB is unavailable. Use Chrome or Edge on localhost or HTTPS.",
      );
    }

    setStatus("connecting");
    setError(null);

    try {
      // Keep requestDevice directly inside the click handler's promise chain;
      // browsers require the device picker to originate from a user gesture.
      const device = await manager.requestDevice({
        filters: getRememberedPrinterFilters(),
      });
      await attachDevice(device);
    } catch (connectionError) {
      const message = messageForError(connectionError);
      setError(message);
      setStatus("error");
      throw connectionError;
    }
  }, [attachDevice]);

  const disconnect = useCallback(async () => {
    await disconnectDevice();
    setError(null);
    setStatus(usb ? "disconnected" : "unsupported");
  }, [disconnectDevice, usb]);

  const printSale = useCallback(async (sale: SaleDetailDTO, context?: ReceiptContext) => {
    const device = deviceRef.current;
    const endpoint = endpointRef.current;

    if (!device || !endpoint || !device.opened) {
      throw new Error("Connect the 80mm USB printer first");
    }

    setStatus("printing");
    setError(null);

    try {
      const result = await device.transferOut(
        endpoint.endpointNumber,
        build80mmEscPosPayload(sale, context),
      );
      if (result.status !== "ok") {
        throw new Error(`Printer transfer failed: ${result.status}`);
      }
      setStatus("connected");
    } catch (printError) {
      const message = messageForError(printError);
      setError(message);
      if (deviceRef.current === device && device.opened) {
        // A transfer can fail while the USB session is still usable.
        setStatus("connected");
      } else {
        await disconnectDevice();
        setStatus("disconnected");
      }
      throw printError;
    }
  }, []);

  useEffect(() => {
    if (!usb) {
      return;
    }

    let cancelled = false;
    const restoreConnection = async () => {
      try {
        const rememberedDevice = await findRememberedPrinter(usb);
        if (!cancelled && rememberedDevice) {
          await attachDevice(rememberedDevice);
        }
      } catch (restoreError) {
        if (!cancelled) {
          setError(messageForError(restoreError));
          setStatus("disconnected");
        }
      }
    };

    const handleDisconnect = (event: Event) => {
      const disconnectedDevice = (event as Event & { device?: UsbDevice })
        .device;
      if (!disconnectedDevice || disconnectedDevice === deviceRef.current) {
        void disconnectDevice();
        setError("Printer disconnected");
        setStatus("disconnected");
      }
    };

    void restoreConnection();
    usb.addEventListener("disconnect", handleDisconnect);

    return () => {
      cancelled = true;
      usb.removeEventListener("disconnect", handleDisconnect);
      void disconnectDevice();
    };
  }, [attachDevice, disconnectDevice, usb]);

  const value = useMemo<PosPrinterContextValue>(
    () => ({
      supported: Boolean(usb),
      connected: status === "connected" || status === "printing",
      status,
      printerName,
      error,
      connect,
      disconnect,
      printSale,
    }),
    [connect, disconnect, error, printerName, printSale, status, usb],
  );

  return (
    <PosPrinterContext.Provider value={value}>
      {children}
    </PosPrinterContext.Provider>
  );
};

export const useOptionalPosPrinter = () => useContext(PosPrinterContext);
