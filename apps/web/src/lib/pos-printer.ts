import type { SaleDetailDTO } from "@repo/types";

import { buildReceiptText } from "@/lib/receipt-text";

const rememberedPrinterKey = "hisab_pos_usb_printer";
const paperWidth = 48;

const esc = {
  init: [0x1b, 0x40],
  alignCenter: [0x1b, 0x61, 0x01],
  alignLeft: [0x1b, 0x61, 0x00],
  boldOn: [0x1b, 0x45, 0x01],
  boldOff: [0x1b, 0x45, 0x00],
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

const getUsbManager = (): UsbManager | null => {
  if (typeof navigator === "undefined") {
    return null;
  }

  return (navigator as Navigator & { usb?: UsbManager }).usb ?? null;
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

const wrapLine = (line: string) => {
  const characters = Array.from(toPrinterText(line));
  if (characters.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  for (let index = 0; index < characters.length; index += paperWidth) {
    lines.push(characters.slice(index, index + paperWidth).join(""));
  }
  return lines;
};

export const build80mmEscPosPayload = (sale: SaleDetailDTO) => {
  const receiptLines = buildReceiptText(sale)
    .split("\n")
    .flatMap(wrapLine);
  const body = receiptLines.slice(3).join("\n").trimEnd() + "\n";

  return concatBytes(
    bytes(esc.init),
    bytes(esc.alignCenter, esc.boldOn),
    encoder.encode(toPrinterText("INVOICE / RECEIPT\n")),
    bytes(esc.boldOff, esc.alignLeft),
    encoder.encode(toPrinterText(body)),
    bytes(esc.feed(), esc.cut),
  );
};

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

const deviceIdentity = (device: UsbDevice) => ({
  vendorId: device.vendorId,
  productId: device.productId,
});

const readRememberedIdentity = () => {
  try {
    const value = window.localStorage.getItem(rememberedPrinterKey);
    return value
      ? (JSON.parse(value) as { vendorId: number; productId: number })
      : null;
  } catch {
    return null;
  }
};

export const getRememberedPrinterFilters = () => {
  const identity = readRememberedIdentity();
  return identity ? [identity] : [];
};

export const saveRememberedPrinter = (device: UsbDevice) => {
  try {
    window.localStorage.setItem(
      rememberedPrinterKey,
      JSON.stringify(deviceIdentity(device)),
    );
  } catch {
    // Local storage may be unavailable; the active connection still works.
  }
};

export const findRememberedPrinter = async (usb: UsbManager) => {
  const identity = readRememberedIdentity();
  if (!identity) {
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

export const getUsbPrinter = getUsbManager;
export type { UsbDevice, UsbManager };
