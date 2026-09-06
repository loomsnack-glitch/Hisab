import type { SaleDetailDTO } from "@repo/types";

import {
  buildReceiptText,
  countWrappedReceiptLines,
  RECEIPT_WIDTH,
  TOKEN_NO_RECEIPT_PREFIX,
  type ReceiptContext,
} from "@/lib/receipt-text";

const rememberedPrinterKey = "hisab_pos_usb_printer";

const esc = {
  init: [0x1b, 0x40],
  fontA: [0x1b, 0x4d, 0x00],
  alignCenter: [0x1b, 0x61, 0x01],
  boldOn: [0x1b, 0x45, 0x01],
  boldOff: [0x1b, 0x45, 0x00],
  doubleSizeOn: [0x1d, 0x21, 0x11],
  doubleSizeOff: [0x1d, 0x21, 0x00],
  feed: (lines = 4) => [0x1b, 0x64, lines],
  cut: [0x1d, 0x56, 0x00],
};

type UsbEndpoint = {
  direction: "in" | "out";
  type: "bulk" | "interrupt" | "isochronous";
  endpointNumber: number;
};

type UsbDevice = {
  opened: boolean;
  configuration: {
    interfaces: Array<{
      interfaceNumber: number;
      alternate: { endpoints: UsbEndpoint[] };
    }>;
  } | null;
  productName?: string;
  vendorId: number;
  productId: number;
  open: () => Promise<void>;
  close: () => Promise<void>;
  selectConfiguration: (configurationValue: number) => Promise<void>;
  claimInterface: (interfaceNumber: number) => Promise<void>;
  releaseInterface: (interfaceNumber: number) => Promise<void>;
  transferOut: (
    endpointNumber: number,
    data: Uint8Array,
  ) => Promise<{ status: string; bytesWritten: number }>;
};

type UsbManager = {
  requestDevice: (options: {
    filters: Array<Record<string, number>>;
  }) => Promise<UsbDevice>;
  getDevices: () => Promise<UsbDevice[]>;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};

type SerialPortInfo = {
  usbVendorId?: number;
  usbProductId?: number;
};

type SerialPort = {
  readable: unknown;
  writable: { getWriter: () => SerialWriter } | null;
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo: () => SerialPortInfo;
};

type SerialWriter = {
  write: (data: Uint8Array) => Promise<void>;
  releaseLock: () => void;
};

type SerialManager = {
  requestPort: (options?: {
    filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
  }) => Promise<SerialPort>;
  getPorts: () => Promise<SerialPort[]>;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};

type BluetoothCharacteristicProperties = {
  write?: boolean;
  writeWithoutResponse?: boolean;
};

export type BluetoothRemoteGATTCharacteristic = {
  properties: BluetoothCharacteristicProperties;
  writeValueWithoutResponse?: (data: Uint8Array) => Promise<void>;
  writeValue?: (data: Uint8Array) => Promise<void>;
};

type BluetoothRemoteGATTService = {
  getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristic[]>;
};

export type BluetoothRemoteGATTServer = {
  connected: boolean;
  connect: () => Promise<BluetoothRemoteGATTServer>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<BluetoothRemoteGATTService[]>;
  getPrimaryService?: (uuid: string) => Promise<BluetoothRemoteGATTService>;
};

export type BluetoothDevice = {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  watchAdvertisements?: () => Promise<void>;
  addEventListener: (type: string, listener: EventListener) => void;
  removeEventListener: (type: string, listener: EventListener) => void;
};

export type BluetoothRequestDeviceFilter = {
  services?: string[];
  namePrefix?: string;
  name?: string;
};

export type BluetoothRequestDeviceOptions = {
  acceptAllDevices?: boolean;
  filters?: BluetoothRequestDeviceFilter[];
  optionalServices?: string[];
};

type BluetoothManager = {
  requestDevice: (options: BluetoothRequestDeviceOptions) => Promise<BluetoothDevice>;
  getDevices?: () => Promise<BluetoothDevice[]>;
};

export type RememberedPrinter =
  | { transport: "usb"; vendorId: number; productId: number }
  | {
      transport: "serial";
      usbVendorId: number | null;
      usbProductId: number | null;
    }
  | { transport: "bluetooth"; deviceId: string; name?: string };

export const SERIAL_BAUD_RATE = 9600;
export const BLUETOOTH_WRITE_CHUNK_SIZE = 20;
export const BLUETOOTH_PRINTER_SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];
export const BLUETOOTH_PRINTER_NAME_PREFIXES = [
  "58",
  "80",
  "Printer",
  "POS",
  "MTP",
  "BT",
  "RPP",
  "XP-",
  "GP",
  "GOOJPRT",
  "PeriPage",
  "Jolimark",
  "Thermal",
  ..."0123456789".split(""),
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  ..."abcdefghijklmnopqrstuvwxyz".split(""),
];

const getUsbManager = (): UsbManager | null => {
  if (typeof navigator === "undefined") {
    return null;
  }

  return (navigator as Navigator & { usb?: UsbManager }).usb ?? null;
};

const getSerialManager = (): SerialManager | null => {
  if (typeof navigator === "undefined") {
    return null;
  }

  return (navigator as Navigator & { serial?: SerialManager }).serial ?? null;
};

const getBluetoothManager = (): BluetoothManager | null => {
  if (typeof navigator === "undefined") {
    return null;
  }

  return (navigator as Navigator & { bluetooth?: BluetoothManager }).bluetooth ?? null;
};

const concatBytes = (...chunks: Uint8Array[]) => {
  const output = new Uint8Array(
    chunks.reduce((total, chunk) => total + chunk.length, 0),
  );
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
};

const bytes = (...parts: number[][]) => new Uint8Array(parts.flat());
const encoder = new TextEncoder();

const toPrinterText = (value: string) =>
  value.normalize("NFKD").replace(/[^\x00-\x7F]/g, "?");

const wrapLine = (line: string, width: number) => {
  const characters = Array.from(toPrinterText(line));
  if (characters.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  for (let index = 0; index < characters.length; index += width) {
    lines.push(characters.slice(index, index + width).join(""));
  }
  return lines;
};

export const isUsbAccessDeniedError = (error: unknown) =>
  /access denied/i.test(error instanceof Error ? error.message : String(error));

export const isPrinterPickerCancelled = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /no device selected|no port selected|user cancelled|cancell?ed the request/i.test(message);
};

export const describeUsbPrinterError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (isUsbAccessDeniedError(error)) {
    return "Windows already claimed this USB printer. It will not appear as a COM port. Use Zadig to install WinUSB on 58Printer, restart Chrome, then connect USB again.";
  }
  return message;
};

export const buildEscPosPayload = (
  sale: SaleDetailDTO,
  context?: ReceiptContext,
  options?: { width?: number },
) => {
  const paperWidth = options?.width ?? RECEIPT_WIDTH;
  const receiptLines = buildReceiptText(sale, context, {
    doubleWidthEmphasis: true,
    width: paperWidth,
  })
    .split("\n")
    .flatMap((line) => wrapLine(line, paperWidth));
  const organizationLineIndex = context?.organizationName?.trim() ? 1 : -1;
  const organizationLineCount =
    organizationLineIndex >= 0
      ? countWrappedReceiptLines(
          context?.organizationName?.trim() ?? "",
          Math.floor(paperWidth / 2),
        )
      : 0;
  const finalAmountLineIndex = receiptLines.findIndex((line) =>
    line.includes("FINAL AMOUNT:"),
  );
  const finalAmountEndIndex = receiptLines.findIndex(
    (line, index) =>
      index > finalAmountLineIndex && line.trim() === "=".repeat(paperWidth),
  );
  const body = receiptLines
    .map((line, index) => {
      const isBrandLine =
        organizationLineIndex >= 0 &&
        index >= organizationLineIndex &&
        index < organizationLineIndex + organizationLineCount;
      const isFinalAmountLine =
        finalAmountLineIndex >= 0 &&
        index >= finalAmountLineIndex &&
        index < finalAmountEndIndex;
      const isTokenNoLine = line.includes(TOKEN_NO_RECEIPT_PREFIX);

      if (isBrandLine || isFinalAmountLine || isTokenNoLine) {
        return concatBytes(
          bytes(esc.alignCenter, esc.boldOn, esc.doubleSizeOn),
          encoder.encode(toPrinterText(`${line.trim()}\n`)),
          bytes(esc.doubleSizeOff, esc.boldOff, esc.alignCenter),
        );
      }

      return encoder.encode(toPrinterText(`${line.padEnd(paperWidth)}\n`));
    })
    .reduce((output, line) => concatBytes(output, line), new Uint8Array());

  return concatBytes(
    bytes(esc.init, esc.fontA, esc.alignCenter),
    body,
    bytes(esc.feed(), esc.cut),
  );
};

export const build80mmEscPosPayload = (
  sale: SaleDetailDTO,
  context?: ReceiptContext,
) => buildEscPosPayload(sale, context, { width: RECEIPT_WIDTH });

const findBulkOutEndpoint = async (device: UsbDevice) => {
  if (!device.configuration) {
    await device.selectConfiguration(1);
  }

  if (!device.configuration) {
    throw new Error("USB printer has no active configuration");
  }

  for (const usbInterface of device.configuration.interfaces) {
    let claimed = false;

    try {
      await device.claimInterface(usbInterface.interfaceNumber);
      claimed = true;

      const endpoint = usbInterface.alternate.endpoints.find(
        (candidate) =>
          candidate.direction === "out" && candidate.type === "bulk",
      );

      if (endpoint) {
        return {
          endpointNumber: endpoint.endpointNumber,
          interfaceNumber: usbInterface.interfaceNumber,
        };
      }
    } catch {
      // Another interface may be the printer's data interface.
    }

    if (claimed) {
      await device
        .releaseInterface(usbInterface.interfaceNumber)
        .catch(() => undefined);
    }
  }

  throw new Error("No USB bulk OUT endpoint found on this printer");
};

export const parseRememberedPrinter = (
  value: unknown,
): RememberedPrinter | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.transport === "bluetooth" && typeof record.deviceId === "string") {
    return {
      transport: "bluetooth",
      deviceId: record.deviceId,
      ...(typeof record.name === "string" && record.name.trim()
        ? { name: record.name }
        : {}),
    };
  }
  if (record.transport === "serial") {
    return {
      transport: "serial",
      usbVendorId:
        typeof record.usbVendorId === "number" ? record.usbVendorId : null,
      usbProductId:
        typeof record.usbProductId === "number" ? record.usbProductId : null,
    };
  }

  if (
    typeof record.vendorId === "number" &&
    typeof record.productId === "number"
  ) {
    return {
      transport: "usb",
      vendorId: record.vendorId,
      productId: record.productId,
    };
  }

  return null;
};

const deviceIdentity = (device: UsbDevice) => ({
  vendorId: device.vendorId,
  productId: device.productId,
});

const readRememberedIdentity = () => {
  try {
    const value = window.localStorage.getItem(rememberedPrinterKey);
    return value ? parseRememberedPrinter(JSON.parse(value)) : null;
  } catch {
    return null;
  }
};

export const readRememberedPrinterIdentity = readRememberedIdentity;

export const getRememberedPrinterFilters = () => {
  const identity = readRememberedIdentity();
  return identity?.transport === "usb"
    ? [{ vendorId: identity.vendorId, productId: identity.productId }]
    : [];
};

export const saveRememberedPrinter = (device: UsbDevice) => {
  try {
    window.localStorage.setItem(
      rememberedPrinterKey,
      JSON.stringify({ transport: "usb", ...deviceIdentity(device) }),
    );
  } catch {
    // Local storage may be unavailable; the active connection still works.
  }
};

export const saveRememberedSerialPrinter = (port: SerialPort) => {
  try {
    const info = port.getInfo();
    window.localStorage.setItem(
      rememberedPrinterKey,
      JSON.stringify({
        transport: "serial",
        usbVendorId: info.usbVendorId ?? null,
        usbProductId: info.usbProductId ?? null,
      }),
    );
  } catch {
    // Local storage may be unavailable; the active connection still works.
  }
};

export const findRememberedPrinter = async (usb: UsbManager) => {
  const identity = readRememberedIdentity();
  if (!identity || identity.transport !== "usb") {
    return null;
  }

  const devices = await usb.getDevices();
  return (
    devices.find(
      (device) =>
        device.vendorId === identity.vendorId &&
        device.productId === identity.productId,
    ) ?? null
  );
};

export const findRememberedSerialPort = async (serial: SerialManager) => {
  const identity = readRememberedIdentity();
  if (!identity || identity.transport !== "serial") {
    return null;
  }

  const ports = await serial.getPorts();
  const matched = ports.find((port) => {
    const info = port.getInfo();
    return (
      identity.usbVendorId != null &&
      identity.usbProductId != null &&
      info.usbVendorId === identity.usbVendorId &&
      info.usbProductId === identity.usbProductId
    );
  });

  return matched ?? (ports.length === 1 ? (ports[0] ?? null) : null);
};

export const prepareUsbPrinter = async (device: UsbDevice) => {
  try {
    if (!device.opened) {
      await device.open();
    }

    return await findBulkOutEndpoint(device);
  } catch (error) {
    await device.close().catch(() => undefined);
    throw error;
  }
};

export const prepareSerialPrinter = async (port: SerialPort) => {
  try {
    await port.open({ baudRate: SERIAL_BAUD_RATE });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/already open/i.test(message)) {
      throw error;
    }
  }

  return port;
};

export const writeSerialPrinter = async (
  port: SerialPort,
  data: Uint8Array,
) => {
  if (!port.writable) {
    throw new Error("Serial printer is not writable");
  }

  const writer = port.writable.getWriter();
  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
};

export const chunkBluetoothPrinterPayload = (
  data: Uint8Array,
  chunkSize = BLUETOOTH_WRITE_CHUNK_SIZE,
) => {
  const size = Math.max(1, chunkSize);
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < data.length; offset += size) {
    chunks.push(data.subarray(offset, offset + size));
  }
  return chunks;
};

export const findWritableBluetoothCharacteristic = async (
  server: Pick<BluetoothRemoteGATTServer, "getPrimaryServices"> & {
    getPrimaryService?: (uuid: string) => Promise<BluetoothRemoteGATTService>;
  },
) => {
  let services: BluetoothRemoteGATTService[] = [];
  try {
    services = await server.getPrimaryServices();
  } catch {
    if (server.getPrimaryService) {
      for (const uuid of BLUETOOTH_PRINTER_SERVICE_UUIDS) {
        try {
          services.push(await server.getPrimaryService(uuid));
        } catch {
          // This printer does not expose that service UUID.
        }
      }
    }
  }

  for (const service of services) {
    const characteristics = await service.getCharacteristics();
    const writable = characteristics.find(
      (characteristic) =>
        characteristic.properties.writeWithoutResponse || characteristic.properties.write,
    );
    if (writable) {
      return writable;
    }
  }

  throw new Error("No writable Bluetooth characteristic found on this printer");
};

export const prepareBluetoothPrinter = async (device: BluetoothDevice) => {
  if (!device.gatt) {
    throw new Error("This Bluetooth device cannot open a printer connection");
  }

  const server = device.gatt.connected ? device.gatt : await device.gatt.connect();
  const characteristic = await findWritableBluetoothCharacteristic(server);
  return { device, characteristic };
};

export const writeBluetoothPrinter = async (
  characteristic: BluetoothRemoteGATTCharacteristic,
  data: Uint8Array,
  chunkSize = BLUETOOTH_WRITE_CHUNK_SIZE,
) => {
  const chunks = chunkBluetoothPrinterPayload(data, chunkSize);
  for (const chunk of chunks) {
    if (
      characteristic.properties.writeWithoutResponse &&
      characteristic.writeValueWithoutResponse
    ) {
      await characteristic.writeValueWithoutResponse(chunk);
      continue;
    }
    if (characteristic.writeValue) {
      await characteristic.writeValue(chunk);
      continue;
    }
    throw new Error("Bluetooth printer characteristic is not writable");
  }
};

export const saveRememberedBluetoothPrinter = (device: BluetoothDevice) => {
  try {
    window.localStorage.setItem(
      rememberedPrinterKey,
      JSON.stringify({
        transport: "bluetooth",
        deviceId: device.id,
        ...(device.name?.trim() ? { name: device.name } : {}),
      }),
    );
  } catch {
    // Local storage may be unavailable; the active connection still works.
  }
};

export const findRememberedBluetoothPrinter = async (
  bluetooth: BluetoothManager,
) => {
  const diagnosis = await diagnoseBluetoothPrinterRestore(bluetooth);
  return diagnosis.matched;
};

export const matchRememberedBluetoothDevice = (
  devices: BluetoothDevice[],
  identity: Extract<RememberedPrinter, { transport: "bluetooth" }>,
) => {
  const byId = devices.find((device) => device.id === identity.deviceId);
  if (byId) {
    return byId;
  }

  const rememberedName = identity.name?.trim();
  if (rememberedName) {
    const byName = devices.find((device) => device.name === rememberedName);
    if (byName) {
      return byName;
    }
  }

  return devices[0] ?? null;
};

export type BluetoothRestoreDiagnosis = {
  origin: string;
  hasGetDevices: boolean;
  remembered: { deviceId: string; name?: string } | null;
  permitted: Array<{ id: string; name?: string; gattConnected: boolean }>;
  matched: BluetoothDevice | null;
  reason:
    | "no-identity"
    | "get-devices-unavailable"
    | "get-devices-failed"
    | "no-permitted-devices"
    | "matched";
};

export const POS_PRINTER_DEBUG_PREFIX = "[hisab-printer]";

export const inspectBluetoothManagerCapabilities = (bluetooth: object) => {
  const proto = Object.getPrototypeOf(bluetooth) as object | null;
  const names = [
    ...Object.getOwnPropertyNames(bluetooth),
    ...(proto ? Object.getOwnPropertyNames(proto) : []),
  ];
  return {
    hasGetDevices: typeof (bluetooth as BluetoothManager).getDevices === "function",
    methodNames: [...new Set(names)].filter((name) => {
      try {
        return typeof (bluetooth as Record<string, unknown>)[name] === "function";
      } catch {
        return false;
      }
    }),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
  };
};

const stringifyPosPrinterDebug = (value: unknown) => {
  if (value instanceof Error) {
    return value.message;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const logPosPrinterDebug = (message: string, extra?: unknown) => {
  if (extra === undefined) {
    console.info(POS_PRINTER_DEBUG_PREFIX, message);
    return message;
  }
  console.info(POS_PRINTER_DEBUG_PREFIX, message, extra);
  return `${message} ${stringifyPosPrinterDebug(extra)}`;
};

export const describeBluetoothRestoreReason = (
  diagnosis: BluetoothRestoreDiagnosis,
) => {
  const rememberedLabel =
    diagnosis.remembered?.name || diagnosis.remembered?.deviceId || "the printer";
  switch (diagnosis.reason) {
    case "get-devices-unavailable":
      return `This Chrome cannot restore Bluetooth after reload. Tap Reconnect and pick ${rememberedLabel}.`;
    case "get-devices-failed":
      return `Chrome getDevices() failed for ${diagnosis.origin}. Tap Bluetooth to reconnect ${rememberedLabel}.`;
    case "no-permitted-devices":
      return `Chrome returned 0 permitted Bluetooth devices for ${diagnosis.origin}. Tap Bluetooth while ${rememberedLabel} is on.`;
    case "matched":
      return `Found ${diagnosis.matched?.name || diagnosis.matched?.id || rememberedLabel}. Connecting…`;
    default:
      return null;
  }
};

export const diagnoseBluetoothPrinterRestore = async (
  bluetooth: BluetoothManager,
): Promise<BluetoothRestoreDiagnosis> => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const identity = readRememberedIdentity();
  const hasGetDevices = typeof bluetooth.getDevices === "function";
  if (!identity || identity.transport !== "bluetooth") {
    return {
      origin,
      hasGetDevices,
      remembered: null,
      permitted: [],
      matched: null,
      reason: "no-identity",
    };
  }

  const remembered = {
    deviceId: identity.deviceId,
    ...(identity.name ? { name: identity.name } : {}),
  };

  if (!hasGetDevices) {
    return {
      origin,
      hasGetDevices,
      remembered,
      permitted: [],
      matched: null,
      reason: "get-devices-unavailable",
    };
  }

  try {
    const devices = await bluetooth.getDevices!();
    const permitted = devices.map((device) => ({
      id: device.id,
      name: device.name,
      gattConnected: Boolean(device.gatt?.connected),
    }));
    const matched = matchRememberedBluetoothDevice(devices, identity);
    return {
      origin,
      hasGetDevices,
      remembered,
      permitted,
      matched,
      reason: matched ? "matched" : "no-permitted-devices",
    };
  } catch (error) {
    logPosPrinterDebug("getDevices threw", error);
    return {
      origin,
      hasGetDevices,
      remembered,
      permitted: [],
      matched: null,
      reason: "get-devices-failed",
    };
  }
};

export const connectBluetoothPrinterWithRetry = async (
  device: BluetoothDevice,
  attempts = 5,
) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      logPosPrinterDebug("GATT connect attempt", {
        attempt,
        attempts,
        id: device.id,
        name: device.name,
        gattConnected: Boolean(device.gatt?.connected),
      });
      return await prepareBluetoothPrinter(device);
    } catch (error) {
      lastError = error;
      logPosPrinterDebug("GATT connect failed", {
        attempt,
        message: error instanceof Error ? error.message : String(error),
      });
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? "Bluetooth connect failed"));
};

export const bluetoothFiltersMatchDeviceName = (
  filters: BluetoothRequestDeviceFilter[],
  name: string,
) =>
  filters.some((filter) => {
    if (filter.name && filter.name === name) {
      return true;
    }
    return Boolean(filter.namePrefix && name.startsWith(filter.namePrefix));
  });

export const getBluetoothPrinterRequestOptions = (
  rememberedName?: string,
): BluetoothRequestDeviceOptions => {
  const filters: BluetoothRequestDeviceFilter[] = [
    ...BLUETOOTH_PRINTER_SERVICE_UUIDS.map((uuid) => ({ services: [uuid] })),
    ...BLUETOOTH_PRINTER_NAME_PREFIXES.map((namePrefix) => ({ namePrefix })),
  ];
  const trimmedName = rememberedName?.trim();
  if (trimmedName) {
    filters.unshift({ name: trimmedName });
    const firstCharacter = trimmedName.slice(0, 1);
    if (firstCharacter) {
      filters.unshift({ namePrefix: firstCharacter });
    }
  }

  return {
    filters,
    optionalServices: [...BLUETOOTH_PRINTER_SERVICE_UUIDS],
  };
};

export const requestBluetoothPrinter = async (
  bluetooth: BluetoothManager,
  rememberedName?: string,
) => {
  const trimmedName = rememberedName?.trim();
  if (trimmedName) {
    try {
      return await bluetooth.requestDevice({
        filters: [
          { name: trimmedName },
          { namePrefix: trimmedName.slice(0, 1) },
        ],
        optionalServices: [...BLUETOOTH_PRINTER_SERVICE_UUIDS],
      });
    } catch (error) {
      if (isPrinterPickerCancelled(error)) {
        throw error;
      }
    }
  }

  try {
    return await bluetooth.requestDevice(
      getBluetoothPrinterRequestOptions(trimmedName),
    );
  } catch (error) {
    if (isPrinterPickerCancelled(error) || trimmedName) {
      throw error;
    }

    return bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [...BLUETOOTH_PRINTER_SERVICE_UUIDS],
    });
  }
};

export const watchBluetoothPrinterAdvertisements = async (
  device: BluetoothDevice,
  onAdvertisement: EventListener,
) => {
  if (!device.watchAdvertisements) {
    logPosPrinterDebug("watchAdvertisements unsupported", { id: device.id, name: device.name });
    return () => undefined;
  }

  device.addEventListener("advertisementreceived", onAdvertisement);
  try {
    await device.watchAdvertisements();
    logPosPrinterDebug("watchAdvertisements listening", { id: device.id, name: device.name });
  } catch (error) {
    logPosPrinterDebug("watchAdvertisements threw", error);
    device.removeEventListener("advertisementreceived", onAdvertisement);
    return () => undefined;
  }

  return () => {
    device.removeEventListener("advertisementreceived", onAdvertisement);
  };
};

export const getUsbPrinter = getUsbManager;
export const getSerialPrinter = getSerialManager;
export const getBluetoothPrinter = getBluetoothManager;
export type { UsbDevice, UsbManager, SerialPort, SerialManager, BluetoothManager };
