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
  buildEscPosPayload,
  connectBluetoothPrinterWithRetry,
  describeBluetoothRestoreReason,
  describeUsbPrinterError,
  diagnoseBluetoothPrinterRestore,
  findRememberedBluetoothPrinter,
  findRememberedPrinter,
  findRememberedSerialPort,
  getBluetoothPrinter,
  getSerialPrinter,
  getUsbPrinter,
  inspectBluetoothManagerCapabilities,
  isPrinterPickerCancelled,
  isUsbAccessDeniedError,
  logPosPrinterDebug,
  prepareSerialPrinter,
  prepareUsbPrinter,
  readRememberedPrinterIdentity,
  requestBluetoothPrinter,
  saveRememberedBluetoothPrinter,
  saveRememberedPrinter,
  saveRememberedSerialPrinter,
  watchBluetoothPrinterAdvertisements,
  writeBluetoothPrinter,
  writeSerialPrinter,
  type BluetoothDevice,
  type BluetoothRemoteGATTCharacteristic,
  type SerialPort,
  type UsbDevice,
} from "@/lib/pos-printer";
import {
  getReceiptPaperWidth,
  persistReceiptPaperSize,
  readReceiptPaperSize,
  type ReceiptPaperSize,
} from "@/lib/receipt-paper-size";
import type { ReceiptContext } from "@/lib/receipt-text";

type PosPrinterStatus =
  | "unsupported"
  | "disconnected"
  | "connecting"
  | "connected"
  | "printing"
  | "error";

export type PosPrinterTransport = "usb" | "serial" | "bluetooth";

type PosPrinterContextValue = {
  supported: boolean;
  usbSupported: boolean;
  serialSupported: boolean;
  bluetoothSupported: boolean;
  connected: boolean;
  status: PosPrinterStatus;
  transport: PosPrinterTransport | null;
  printerName: string | null;
  error: string | null;
  debugLines: string[];
  paperSize: ReceiptPaperSize;
  setPaperSize: (paperSize: ReceiptPaperSize) => void;
  connectUsb: () => Promise<boolean>;
  connectSerial: () => Promise<boolean>;
  connectBluetooth: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  printSale: (sale: SaleDetailDTO, context?: ReceiptContext) => Promise<void>;
  needsBluetoothReconnectTap: boolean;
};

const PosPrinterContext = createContext<PosPrinterContextValue | null>(null);

const messageForError = (error: unknown) => describeUsbPrinterError(error);

export const PosPrinterProvider = ({ children }: { children: ReactNode }) => {
  const usb = getUsbPrinter();
  const serial = getSerialPrinter();
  const bluetooth = getBluetoothPrinter();
  const usbDeviceRef = useRef<UsbDevice | null>(null);
  const usbEndpointRef = useRef<{
    endpointNumber: number;
    interfaceNumber: number;
  } | null>(null);
  const serialPortRef = useRef<SerialPort | null>(null);
  const bluetoothDeviceRef = useRef<BluetoothDevice | null>(null);
  const bluetoothCharacteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const bluetoothDisconnectListenerRef = useRef<EventListener | null>(null);
  const bluetoothWatchStopRef = useRef<(() => void) | null>(null);
  const intentionalBluetoothDisconnectRef = useRef(false);
  const reconnectingBluetoothRef = useRef(false);
  const lastBluetoothReconnectAtRef = useRef(0);
  const reconnectBluetoothRef = useRef<(device: BluetoothDevice) => Promise<void>>(
    async () => undefined,
  );
  const [status, setStatus] = useState<PosPrinterStatus>(
    usb || serial || bluetooth ? "disconnected" : "unsupported",
  );
  const [transport, setTransport] = useState<PosPrinterTransport | null>(null);
  const [printerName, setPrinterName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [paperSize, setPaperSizeState] = useState<ReceiptPaperSize>(() =>
    readReceiptPaperSize("pos"),
  );

  const pushDebug = useCallback((message: string, extra?: unknown) => {
    const line = logPosPrinterDebug(message, extra);
    const timestamp = new Date().toISOString().slice(11, 23);
    setDebugLines((current) => [...current.slice(-15), `${timestamp} ${line}`]);
  }, []);

  const setPaperSize = useCallback((nextPaperSize: ReceiptPaperSize) => {
    setPaperSizeState(nextPaperSize);
    persistReceiptPaperSize("pos", nextPaperSize);
  }, []);

  const idleStatus = usb || serial || bluetooth ? "disconnected" : "unsupported";

  const stopBluetoothWatch = useCallback(() => {
    bluetoothWatchStopRef.current?.();
    bluetoothWatchStopRef.current = null;
  }, []);

  const unbindBluetoothDisconnectListener = useCallback((device: BluetoothDevice | null) => {
    const listener = bluetoothDisconnectListenerRef.current;
    if (!device || !listener) {
      bluetoothDisconnectListenerRef.current = null;
      return;
    }
    device.removeEventListener("gattserverdisconnected", listener);
    bluetoothDisconnectListenerRef.current = null;
  }, []);

  const disconnectDevice = useCallback(async (options?: { includeBluetooth?: boolean }) => {
    const includeBluetooth = options?.includeBluetooth !== false;
    const device = usbDeviceRef.current;
    const endpoint = usbEndpointRef.current;
    const port = serialPortRef.current;
    const bluetoothDevice = includeBluetooth ? bluetoothDeviceRef.current : null;
    if (includeBluetooth) {
      intentionalBluetoothDisconnectRef.current = true;
      stopBluetoothWatch();
      unbindBluetoothDisconnectListener(bluetoothDevice);
      bluetoothDeviceRef.current = null;
      bluetoothCharacteristicRef.current = null;
    }
    usbDeviceRef.current = null;
    usbEndpointRef.current = null;
    serialPortRef.current = null;
    if (includeBluetooth) {
      setPrinterName(null);
      setTransport(null);
    }

    if (device && endpoint) {
      await device
        .releaseInterface(endpoint.interfaceNumber)
        .catch(() => undefined);
    }
    if (device?.opened) {
      await device.close().catch(() => undefined);
    }
    if (port) {
      await port.close().catch(() => undefined);
    }
    if (bluetoothDevice?.gatt?.connected) {
      bluetoothDevice.gatt.disconnect();
    }
    if (includeBluetooth) {
      intentionalBluetoothDisconnectRef.current = false;
    }
  }, [stopBluetoothWatch, unbindBluetoothDisconnectListener]);

  const attachUsbDevice = useCallback(async (device: UsbDevice) => {
    await disconnectDevice();
    const endpoint = await prepareUsbPrinter(device);
    usbDeviceRef.current = device;
    usbEndpointRef.current = endpoint;
    saveRememberedPrinter(device);
    setTransport("usb");
    setPrinterName(device.productName || "USB printer");
    setError(null);
    setStatus("connected");
  }, [disconnectDevice]);

  const attachSerialPort = useCallback(async (port: SerialPort) => {
    await disconnectDevice();
    await prepareSerialPrinter(port);
    serialPortRef.current = port;
    saveRememberedSerialPrinter(port);
    setTransport("serial");
    setPrinterName("COM printer");
    setError(null);
    setStatus("connected");
  }, [disconnectDevice]);

  const startBluetoothWatch = useCallback((device: BluetoothDevice) => {
    stopBluetoothWatch();
    pushDebug("watchAdvertisements start", {
      id: device.id,
      name: device.name,
      supported: Boolean(device.watchAdvertisements),
    });
    void watchBluetoothPrinterAdvertisements(device, () => {
      pushDebug("advertisementreceived", {
        id: device.id,
        gattConnected: Boolean(device.gatt?.connected),
      });
      if (intentionalBluetoothDisconnectRef.current) {
        return;
      }
      if (device.gatt?.connected && bluetoothCharacteristicRef.current) {
        return;
      }
      void reconnectBluetoothRef.current(device);
    }).then((stop) => {
      bluetoothWatchStopRef.current = stop;
      pushDebug("watchAdvertisements ready", { id: device.id });
    });
  }, [pushDebug, stopBluetoothWatch]);

  const markBluetoothWaiting = useCallback((device: BluetoothDevice, name?: string, restoreError?: string) => {
    bluetoothDeviceRef.current = device;
    bluetoothCharacteristicRef.current = null;
    setTransport("bluetooth");
    setPrinterName(device.name || name || "Bluetooth printer");
    setError(restoreError ?? null);
    setStatus("disconnected");
    startBluetoothWatch(device);
  }, [startBluetoothWatch]);

  const bindBluetoothDisconnectListener = useCallback((device: BluetoothDevice) => {
    unbindBluetoothDisconnectListener(device);
    const listener: EventListener = () => {
      pushDebug("gattserverdisconnected", {
        id: device.id,
        intentional: intentionalBluetoothDisconnectRef.current,
      });
      if (intentionalBluetoothDisconnectRef.current) {
        return;
      }
      if (bluetoothDeviceRef.current !== device) {
        return;
      }
      bluetoothCharacteristicRef.current = null;
      setStatus("connecting");
      void reconnectBluetoothRef.current(device);
    };
    bluetoothDisconnectListenerRef.current = listener;
    device.addEventListener("gattserverdisconnected", listener);
  }, [pushDebug, unbindBluetoothDisconnectListener]);

  const attachBluetoothDevice = useCallback(async (
    device: BluetoothDevice,
    options?: { retries?: number },
  ) => {
    pushDebug("attach start", {
      id: device.id,
      name: device.name,
      retries: options?.retries ?? 1,
      gattConnected: Boolean(device.gatt?.connected),
    });
    if (bluetoothDeviceRef.current !== device) {
      await disconnectDevice();
    } else {
      stopBluetoothWatch();
      unbindBluetoothDisconnectListener(device);
    }

    const prepared = await connectBluetoothPrinterWithRetry(device, options?.retries ?? 1);
    bluetoothDeviceRef.current = prepared.device;
    bluetoothCharacteristicRef.current = prepared.characteristic;
    saveRememberedBluetoothPrinter(prepared.device);
    bindBluetoothDisconnectListener(prepared.device);
    startBluetoothWatch(prepared.device);
    setTransport("bluetooth");
    setPrinterName(prepared.device.name || "Bluetooth printer");
    setError(null);
    setStatus("connected");
    pushDebug("attach connected", {
      id: prepared.device.id,
      name: prepared.device.name,
    });
  }, [
    bindBluetoothDisconnectListener,
    disconnectDevice,
    pushDebug,
    startBluetoothWatch,
    stopBluetoothWatch,
    unbindBluetoothDisconnectListener,
  ]);

  const reconnectBluetooth = useCallback(async (device: BluetoothDevice) => {
    if (reconnectingBluetoothRef.current) {
      return;
    }
    const now = Date.now();
    if (now - lastBluetoothReconnectAtRef.current < 1000) {
      return;
    }

    lastBluetoothReconnectAtRef.current = now;
    reconnectingBluetoothRef.current = true;
    pushDebug("reconnect start", { id: device.id, name: device.name });
    try {
      await attachBluetoothDevice(device, { retries: 3 });
      pushDebug("reconnect connected", { id: device.id });
    } catch (error) {
      pushDebug("reconnect failed", error);
      markBluetoothWaiting(
        device,
        device.name,
        `${messageForError(error)}. Tap Bluetooth to retry.`,
      );
    } finally {
      reconnectingBluetoothRef.current = false;
    }
  }, [attachBluetoothDevice, markBluetoothWaiting, pushDebug]);

  reconnectBluetoothRef.current = reconnectBluetooth;

  const connectUsb = useCallback(async () => {
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
      const device = await manager.requestDevice({
        filters: [],
      });
      await attachUsbDevice(device);
    } catch (connectionError) {
      if (isPrinterPickerCancelled(connectionError)) {
        setError(null);
        setStatus(idleStatus);
        return false;
      }
      const message = messageForError(connectionError);
      setError(message);
      setStatus("error");
      throw new Error(message);
    }

    return true;
  }, [attachUsbDevice, idleStatus]);

  const connectSerial = useCallback(async () => {
    const manager = getSerialPrinter();
    if (!manager) {
      setStatus("unsupported");
      throw new Error(
        "COM port printing is unavailable. Use Chrome or Edge on localhost or HTTPS.",
      );
    }

    setStatus("connecting");
    setError(null);

    try {
      const port = await manager.requestPort();
      await attachSerialPort(port);
    } catch (connectionError) {
      if (isPrinterPickerCancelled(connectionError)) {
        setError(null);
        setStatus(idleStatus);
        return false;
      }
      const message = messageForError(connectionError);
      setError(message);
      setStatus("error");
      throw new Error(message);
    }

    return true;
  }, [attachSerialPort, idleStatus]);

  const connectBluetooth = useCallback(async () => {
    const manager = getBluetoothPrinter();
    if (!manager) {
      setStatus("unsupported");
      throw new Error(
        "Bluetooth printing is unavailable. Use Chrome or Edge on this phone or computer, with Bluetooth turned on.",
      );
    }

    setStatus("connecting");
    setError(null);
    pushDebug("user tapped Bluetooth", {
      origin: window.location.origin,
    });

    try {
      if (typeof manager.getDevices === "function") {
        const remembered = await findRememberedBluetoothPrinter(manager);
        pushDebug("user tap permitted device", {
          id: remembered?.id,
          name: remembered?.name,
        });
        if (remembered) {
          try {
            await attachBluetoothDevice(remembered, { retries: 3 });
            return true;
          } catch (rememberedError) {
            pushDebug("user tap remembered attach failed, opening chooser", rememberedError);
          }
        }
      } else {
        pushDebug("user tap skipping getDevices, opening chooser", {
          name: readRememberedPrinterIdentity()?.transport === "bluetooth"
            ? readRememberedPrinterIdentity()?.name
            : undefined,
        });
      }

      const identity = readRememberedPrinterIdentity();
      const device = await requestBluetoothPrinter(
        manager,
        identity?.transport === "bluetooth" ? identity.name : undefined,
      );
      pushDebug("chooser selected", { id: device.id, name: device.name });
      await attachBluetoothDevice(device, { retries: 3 });
    } catch (connectionError) {
      if (isPrinterPickerCancelled(connectionError)) {
        setError(null);
        setStatus(idleStatus);
        return false;
      }
      const message = messageForError(connectionError);
      setError(message);
      setStatus("error");
      throw new Error(message);
    }

    return true;
  }, [attachBluetoothDevice, idleStatus, pushDebug]);

  const disconnect = useCallback(async () => {
    await disconnectDevice();
    setError(null);
    setStatus(idleStatus);
  }, [disconnectDevice, idleStatus]);

  const printSale = useCallback(async (sale: SaleDetailDTO, context?: ReceiptContext) => {
    const device = usbDeviceRef.current;
    const endpoint = usbEndpointRef.current;
    const port = serialPortRef.current;
    const bluetoothCharacteristic = bluetoothCharacteristicRef.current;
    const payload = buildEscPosPayload(sale, context, {
      width: getReceiptPaperWidth(paperSize),
    });

    if (bluetoothCharacteristic) {
      setStatus("printing");
      setError(null);
      try {
        await writeBluetoothPrinter(bluetoothCharacteristic, payload);
        setStatus("connected");
      } catch (printError) {
        const message = messageForError(printError);
        setError(message);
        const bluetoothDevice = bluetoothDeviceRef.current;
        if (bluetoothDevice) {
          markBluetoothWaiting(bluetoothDevice);
        } else {
          await disconnectDevice();
          setStatus("disconnected");
        }
        throw new Error(message);
      }
      return;
    }

    if (port) {
      setStatus("printing");
      setError(null);
      try {
        await writeSerialPrinter(port, payload);
        setStatus("connected");
      } catch (printError) {
        const message = messageForError(printError);
        setError(message);
        await disconnectDevice();
        setStatus("disconnected");
        throw new Error(message);
      }
      return;
    }

    if (!device || !endpoint || !device.opened) {
      throw new Error("Connect the receipt printer first");
    }

    setStatus("printing");
    setError(null);

    try {
      const result = await device.transferOut(endpoint.endpointNumber, payload);
      if (result.status !== "ok") {
        throw new Error(`Printer transfer failed: ${result.status}`);
      }
      setStatus("connected");
    } catch (printError) {
      const message = messageForError(printError);
      setError(message);
      if (usbDeviceRef.current === device && device.opened) {
        setStatus("connected");
      } else {
        await disconnectDevice();
        setStatus("disconnected");
      }
      throw new Error(message);
    }
  }, [disconnectDevice, markBluetoothWaiting, paperSize]);

  useEffect(() => {
    if (!usb && !serial && !bluetooth) {
      return;
    }

    let cancelled = false;
    const restoreConnection = async () => {
      try {
        const rememberedIdentity = readRememberedPrinterIdentity();
        if (rememberedIdentity?.transport === "bluetooth") {
          if (!bluetooth) {
            pushDebug("restore skipped, Web Bluetooth missing");
            setStatus("disconnected");
            return;
          }

          pushDebug("restore start", {
            origin: window.location.origin,
            deviceId: rememberedIdentity.deviceId,
            name: rememberedIdentity.name,
            capabilities: inspectBluetoothManagerCapabilities(bluetooth),
          });
          const diagnosis = await diagnoseBluetoothPrinterRestore(bluetooth);
          pushDebug("restore diagnosis", {
            reason: diagnosis.reason,
            origin: diagnosis.origin,
            hasGetDevices: diagnosis.hasGetDevices,
            remembered: diagnosis.remembered,
            permitted: diagnosis.permitted,
          });
          const restoreHint = describeBluetoothRestoreReason(diagnosis);
          if (cancelled) {
            pushDebug("restore cancelled before attach");
            return;
          }
          if (diagnosis.matched) {
            setTransport("bluetooth");
            setPrinterName(
              diagnosis.matched.name || rememberedIdentity.name || "Bluetooth printer",
            );
            setStatus("connecting");
            if (restoreHint) {
              setError(restoreHint);
            }
            startBluetoothWatch(diagnosis.matched);
            try {
              await attachBluetoothDevice(diagnosis.matched, { retries: 5 });
              pushDebug("restore connected");
            } catch (restoreError) {
              pushDebug("restore GATT gave up", restoreError);
              if (!cancelled) {
                markBluetoothWaiting(
                  diagnosis.matched,
                  rememberedIdentity.name,
                  `${messageForError(restoreError)}. Tap the Remembered card or Bluetooth to retry.`,
                );
              }
            }
            return;
          }

          setTransport("bluetooth");
          setPrinterName(rememberedIdentity.name || "Bluetooth printer");
          setError(restoreHint);
          setStatus("disconnected");
          return;
        }

        if (serial) {
          const rememberedPort = await findRememberedSerialPort(serial);
          if (!cancelled && rememberedPort) {
            await attachSerialPort(rememberedPort);
            return;
          }
        }

        if (usb) {
          const rememberedDevice = await findRememberedPrinter(usb);
          if (!cancelled && rememberedDevice) {
            await attachUsbDevice(rememberedDevice);
          }
        }
      } catch (restoreError) {
        if (cancelled) {
          return;
        }

        if (isUsbAccessDeniedError(restoreError) || isPrinterPickerCancelled(restoreError)) {
          setError(null);
          setStatus(idleStatus);
          return;
        }

        setError(messageForError(restoreError));
        setStatus("disconnected");
      }
    };

    const handleUsbDisconnect = (event: Event) => {
      const disconnectedDevice = (event as Event & { device?: UsbDevice })
        .device;
      if (!disconnectedDevice || disconnectedDevice === usbDeviceRef.current) {
        void disconnectDevice();
        setError("Printer disconnected");
        setStatus("disconnected");
      }
    };

    const handleSerialDisconnect = (event: Event) => {
      const disconnectedPort = (event as Event & { port?: SerialPort }).port;
      if (!disconnectedPort || disconnectedPort === serialPortRef.current) {
        void disconnectDevice();
        setError("Printer disconnected");
        setStatus("disconnected");
      }
    };

    void restoreConnection();
    usb?.addEventListener("disconnect", handleUsbDisconnect);
    serial?.addEventListener("disconnect", handleSerialDisconnect);

    return () => {
      cancelled = true;
      usb?.removeEventListener("disconnect", handleUsbDisconnect);
      serial?.removeEventListener("disconnect", handleSerialDisconnect);
      void disconnectDevice({ includeBluetooth: false });
    };
  }, [attachBluetoothDevice, attachSerialPort, attachUsbDevice, bluetooth, disconnectDevice, idleStatus, markBluetoothWaiting, pushDebug, serial, startBluetoothWatch, usb]);

  const value = useMemo<PosPrinterContextValue>(
    () => ({
      supported: Boolean(usb || serial || bluetooth),
      usbSupported: Boolean(usb),
      serialSupported: Boolean(serial),
      bluetoothSupported: Boolean(bluetooth),
      connected: status === "connected" || status === "printing",
      status,
      transport,
      printerName,
      error,
      debugLines,
      paperSize,
      setPaperSize,
      connectUsb,
      connectSerial,
      connectBluetooth,
      disconnect,
      printSale,
      needsBluetoothReconnectTap:
        Boolean(printerName) &&
        transport === "bluetooth" &&
        status !== "connected" &&
        status !== "printing" &&
        status !== "connecting",
    }),
    [
      bluetooth,
      connectBluetooth,
      connectSerial,
      connectUsb,
      debugLines,
      disconnect,
      error,
      paperSize,
      printerName,
      printSale,
      serial,
      setPaperSize,
      status,
      transport,
      usb,
    ],
  );

  return (
    <PosPrinterContext.Provider value={value}>
      {children}
    </PosPrinterContext.Provider>
  );
};

export const useOptionalPosPrinter = () => useContext(PosPrinterContext);
