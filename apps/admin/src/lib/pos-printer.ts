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

export type RememberedPrinter =
  | { transport: "usb"; vendorId: number; productId: number }
  | {
      transport: "serial";
      usbVendorId: number | null;
      usbProductId: number | null;
    };

export const SERIAL_BAUD_RATE = 9600;

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
  return /no device selected|no port selected|not found/i.test(message);
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

export const getUsbPrinter = getUsbManager;
export const getSerialPrinter = getSerialManager;
export type { UsbDevice, UsbManager, SerialPort, SerialManager };
