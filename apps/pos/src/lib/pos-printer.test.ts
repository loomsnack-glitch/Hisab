import { afterEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import type { SaleDetailDTO } from "@repo/types";

import {
  build80mmEscPosPayload,
  buildEscPosPayload,
  chunkBluetoothPrinterPayload,
  connectBluetoothPrinterWithRetry,
  describeBluetoothRestoreReason,
  describeUsbPrinterError,
  diagnoseBluetoothPrinterRestore,
  inspectBluetoothManagerCapabilities,
  bluetoothFiltersMatchDeviceName,
  findRememberedBluetoothPrinter,
  findWritableBluetoothCharacteristic,
  getBluetoothPrinterRequestOptions,
  isPrinterPickerCancelled,
  isUsbAccessDeniedError,
  parseRememberedPrinter,
  requestBluetoothPrinter,
  saveRememberedBluetoothPrinter,
  writeBluetoothPrinter,
  writeSerialPrinter,
} from "./pos-printer";
import { getReceiptPaperWidth } from "./receipt-paper-size";
import { buildReceiptText, RECEIPT_WIDTH } from "./receipt-text";

const sale = {
  saleNumber: "INV-1042",
  createdAt: "2026-08-04T12:00:00.000Z",
  status: "completed",
  paymentStatus: "paid",
  customer: null,
  items: [
    {
      productNameSnapshot: "Masala Dosa",
      quantity: 2,
      unitPriceSnapshot: 90,
      lineTotal: 180,
      discountAmount: 0,
      addOns: [],
      bundleComponents: [],
    },
  ],
  payments: [],
  subtotal: 180,
  orderDiscountAmount: 0,
  grandTotal: 180,
  paidTotal: 180,
  dueTotal: 0,
} as unknown as SaleDetailDTO;

describe("80mm ESC/POS receipt payload", () => {
  test("initializes, prints the sale, feeds, and cuts", () => {
    const payload = build80mmEscPosPayload(sale);
    const output = new TextDecoder().decode(payload);

    expect(Array.from(payload.slice(0, 2))).toEqual([0x1b, 0x40]);
    expect(output).toContain("INVOICE / RECEIPT");
    expect(output).toContain("Bill No: INV-1042");
    expect(Array.from(payload.slice(-6))).toEqual([
      0x1b, 0x64, 0x04, 0x1d, 0x56, 0x00,
    ]);
  });

  test("prints a simple token number when the sale has one", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload({ ...sale, tokenNumber: "001" }),
    );

    expect(output).toContain("TOKEN NO: 001");
    expect(output.indexOf("Bill No: INV-1042")).toBeLessThan(
      output.indexOf("TOKEN NO: 001"),
    );
  });

  test("prints bill, table, KOT, and token lines in order with compact KOT values", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload({
        ...sale,
        tokenNumber: "001",
        kotNumbers: ["KOT-001", "KOT-002"],
        serviceTableLabel: "A1",
      }),
    );

    expect(output).toContain("Bill No: INV-1042");
    expect(output).toContain("Table No: A1");
    expect(output).toContain("KOT NO: 001, 002");
    expect(output).toContain("TOKEN NO: 001");
    expect(output).not.toContain("KOT-001");
    expect(output.indexOf("Bill No: INV-1042")).toBeLessThan(output.indexOf("Table No: A1"));
    expect(output.indexOf("Table No: A1")).toBeLessThan(output.indexOf("KOT NO: 001, 002"));
    expect(output.indexOf("KOT NO: 001, 002")).toBeLessThan(output.indexOf("TOKEN NO: 001"));
  });

  test("uses an ASCII-safe fallback for unsupported printer characters", () => {
    const localizedSale = {
      ...sale,
      items: [{ ...sale.items[0], productNameSnapshot: "चाय" }],
    };
    const output = new TextDecoder().decode(
      build80mmEscPosPayload(localizedSale),
    );

    expect(output).toContain("??");
  });

  test("keeps item columns and wraps long names without paid or due rows", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload({
        ...sale,
        items: [
          {
            ...sale.items[0],
            productNameSnapshot:
              "Extra Long Masala Dosa With Cheese And Vegetables",
          },
        ],
      }),
    );

    expect(output).toContain("ITEM");
    expect(output).toContain("QTY");
    expect(output).toContain("RATE");
    expect(output).toContain("PRICE");
    expect(output).toContain("Extra Long Masala");
    expect(output).toContain("Dosa With Cheese And");
    expect(output).toContain("Vegetables");
    expect(output).not.toContain("Collected:");
    expect(output).not.toContain("Due:");
    expect(output).toContain("FINAL AMOUNT: 180");
    expect(output).not.toContain("Payable:");
    expect(output).toContain("Thank you! Visit again");
  });

  test("prints organization and store context above the bill", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload(sale, {
        organizationName: "Hisab Foods",
        organizationTagline: "Fresh taste, every day",
        storeName: "Main Store",
        storeAddress: "12 Market Road",
      }),
    );

    expect(output).toContain("Hisab Foods");
    expect(output).toContain("Fresh taste, every day");
    expect(output).toContain("Main Store");
    expect(output).toContain("12 Market Road");
    expect(output).toContain("INVOICE / RECEIPT");
    expect(output).toContain("\u001bM\u0000");
    expect(output).toContain("\u001d!\u0011");
  });

  test("keeps every wrapped brand line emphasized", () => {
    const organizationName = "A".repeat(50);
    const output = new TextDecoder().decode(
      build80mmEscPosPayload(sale, { organizationName }),
    );
    const doubleSizeStarts = output.match(/\u001d!\u0011/g) ?? [];

    expect(doubleSizeStarts).toHaveLength(4);
  });

  test("indents add-ons and combo components under their parent item", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload({
        ...sale,
        items: [
          {
            ...sale.items[0],
            productNameSnapshot: "Combo Meal",
            addOns: [
              {
                addOnNameSnapshot: "Extra Cheese",
                totalQuantity: 1,
                unitPriceSnapshot: 20,
                lineTotal: 20,
                discountAmount: 0,
              },
            ],
            bundleComponents: [
              {
                productNameSnapshot: "Side Salad",
                totalQuantity: 1,
                unitPriceSnapshot: 0,
                priceAdjustmentSnapshot: 0,
                addOns: [],
              },
            ],
          },
        ],
      }),
    );

    expect(output).toContain("  + Extra Cheese");
    expect(output).toContain("  * Side Salad");
  });

  test("prints the Sold Product Name amount suffix on a Product line", () => {
    const cakeSale = {
      ...sale,
      items: [
        {
          ...sale.items[0],
          productNameSnapshot: "Cake (250g)",
          quantity: 2,
          unitPriceSnapshot: 250,
          lineTotal: 500,
        },
      ],
      subtotal: 500,
      grandTotal: 500,
      paidTotal: 500,
    };
    const output = new TextDecoder().decode(build80mmEscPosPayload(cakeSale));
    const receipt = buildReceiptText(cakeSale, {}, { width: RECEIPT_WIDTH });

    expect(output).toContain("Cake (250g)");
    expect(receipt).toContain("Cake (250g)");
    expect(receipt).toContain("2");
    expect(receipt).toContain("250");
    expect(receipt).toContain("500");
  });

  test("prints a custom 500 g Cake portion separately from the default 250 g line", () => {
    const cakeSale = {
      ...sale,
      items: [
        {
          ...sale.items[0],
          productNameSnapshot: "Cake (250g)",
          quantity: 2,
          unitPriceSnapshot: 250,
          lineTotal: 500,
        },
        {
          ...sale.items[0],
          id: "sale-item-custom",
          productNameSnapshot: "Cake (500g)",
          quantity: 1,
          unitPriceSnapshot: 500,
          lineTotal: 500,
        },
      ],
      subtotal: 1000,
      grandTotal: 1000,
      paidTotal: 1000,
    };
    const output = new TextDecoder().decode(build80mmEscPosPayload(cakeSale));
    const receipt = buildReceiptText(cakeSale, {}, { width: RECEIPT_WIDTH });

    expect(output).toContain("Cake (250g)");
    expect(output).toContain("Cake (500g)");
    expect(receipt).toContain("Cake (250g)");
    expect(receipt).toContain("Cake (500g)");
    expect(receipt).toContain("500");
  });

  test("prints a custom Cake (500g) line with its add-on snapshot", () => {
    const cakeSale = {
      ...sale,
      items: [
        {
          ...sale.items[0],
          productNameSnapshot: "Cake (500g)",
          quantity: 1,
          unitPriceSnapshot: 500,
          lineTotal: 500,
          addOns: [
            {
              addOnNameSnapshot: "Extra Cheese",
              totalQuantity: 1,
              unitPriceSnapshot: 20,
              lineTotal: 18,
            },
          ],
        },
      ],
      subtotal: 520,
      grandTotal: 518,
      paidTotal: 518,
    };
    const output = new TextDecoder().decode(build80mmEscPosPayload(cakeSale));
    const receipt = buildReceiptText(cakeSale, {}, { width: RECEIPT_WIDTH });

    expect(output).toContain("Cake (500g)");
    expect(output).toContain("Extra Cheese");
    expect(receipt).toContain("Cake (500g)");
    expect(receipt).toContain("+ Extra Cheese");
    expect(receipt).toContain("500");
    expect(receipt).toContain("18");
  });

  test("wraps a long organization tagline to the printer width", () => {
    const output = new TextDecoder().decode(
      build80mmEscPosPayload(sale, {
        organizationName: "Hisab Foods",
        organizationTagline: "A".repeat(80),
      }),
    );

    expect(output).toContain("A".repeat(42));
    expect(output).toContain("A".repeat(38));
  });

  test("wraps long organization names and final amounts without dropping text", () => {
    const organizationName =
      "A Very Long Organization Name That Must Stay Fully Printed";
    const grandTotal = "123456789012345678901234567890";
    const customerName = "A Customer With A Name That Must Wrap Safely";
    const customerPhone = "12345678901234567890";
    const output = buildReceiptText(
      {
        ...sale,
        grandTotal,
        customer: { name: customerName, phone: customerPhone },
      },
      { organizationName },
      { width: RECEIPT_WIDTH },
    );
    const compactOutput = output.replace(/\s/g, "");

    expect(compactOutput).toContain(organizationName.replace(/\s/g, ""));
    expect(compactOutput).toContain(grandTotal);
    expect(compactOutput).toContain(customerName.replace(/\s/g, ""));
    expect(compactOutput).toContain(customerPhone);
    expect(output.split("\n").every((line) => line.length <= 42)).toBe(true);
  });

  test("wraps item values when a table column is too narrow", () => {
    const output = buildReceiptText(
      {
        ...sale,
        items: [
          {
            ...sale.items[0],
            quantity: 123456789,
            unitPriceSnapshot: "1234567890",
            lineTotal: "987654321012345",
          },
        ],
      },
      {},
      { width: RECEIPT_WIDTH },
    );
    const compactOutput = output.replace(/\s/g, "");

    expect(compactOutput).toContain("123456789");
    expect(output).toContain("12345678");
    expect(output).toContain("98765432");
    expect(output).toContain("1012345");
    expect(output.split("\n").every((line) => line.length <= 42)).toBe(true);
  });

  test("rejects an invalid receipt width before wrapping", () => {
    expect(() => buildReceiptText(sale, {}, { width: 22 })).toThrow(
      "Receipt width must be an integer",
    );
  });

  test("wraps a 58mm receipt to 32 characters", () => {
    const width = getReceiptPaperWidth("58mm");
    const output = new TextDecoder().decode(
      buildEscPosPayload(
        sale,
        {
          organizationName: "Hisab Foods",
          organizationTagline: "A".repeat(80),
        },
        { width },
      ),
    );
    const receipt = buildReceiptText(
      sale,
      { organizationName: "Hisab Foods", organizationTagline: "A".repeat(80) },
      { width },
    );

    expect(width).toBe(32);
    expect(output).toContain("A".repeat(32));
    expect(receipt.split("\n").every((line) => line.length <= 32)).toBe(true);
  });
});

describe("USB printer errors", () => {
  test("explains Windows Access denied and points to COM port", () => {
    expect(
      describeUsbPrinterError(
        new Error("Failed to execute 'open' on 'USBDevice': Access denied."),
      ),
    ).toContain("Use Zadig to install WinUSB");
    expect(
      isUsbAccessDeniedError(
        new Error("Failed to execute 'open' on 'USBDevice': Access denied."),
      ),
    ).toBe(true);
  });

  test("keeps unrelated USB errors unchanged", () => {
    expect(
      describeUsbPrinterError(
        new Error("No USB bulk OUT endpoint found on this printer"),
      ),
    ).toBe("No USB bulk OUT endpoint found on this printer");
  });
});

describe("remembered printer identity", () => {
  test("treats legacy USB records as usb transport", () => {
    expect(parseRememberedPrinter({ vendorId: 1046, productId: 20497 })).toEqual({
      transport: "usb",
      vendorId: 1046,
      productId: 20497,
    });
  });

  test("reads a serial COM-port record", () => {
    expect(
      parseRememberedPrinter({
        transport: "serial",
        usbVendorId: 6790,
        usbProductId: 29987,
      }),
    ).toEqual({
      transport: "serial",
      usbVendorId: 6790,
      usbProductId: 29987,
    });
  });

  test("reads a Bluetooth printer record", () => {
    expect(
      parseRememberedPrinter({
        transport: "bluetooth",
        deviceId: "ble-58printer",
      }),
    ).toEqual({
      transport: "bluetooth",
      deviceId: "ble-58printer",
    });
    expect(
      parseRememberedPrinter({
        transport: "bluetooth",
        deviceId: "ble-58printer",
        name: "58Printer",
      }),
    ).toEqual({
      transport: "bluetooth",
      deviceId: "ble-58printer",
      name: "58Printer",
    });
  });

  test("writes receipt bytes through a serial port", async () => {
    const written: Uint8Array[] = [];
    let released = false;
    await writeSerialPrinter(
      {
        writable: {
          getWriter: () => ({
            write: async (data: Uint8Array) => {
              written.push(data);
            },
            releaseLock: () => {
              released = true;
            },
          }),
        },
        readable: null,
        open: async () => undefined,
        close: async () => undefined,
        getInfo: () => ({}),
      },
      new Uint8Array([0x1b, 0x40]),
    );

    expect(Array.from(written[0] ?? [])).toEqual([0x1b, 0x40]);
    expect(released).toBe(true);
  });
});

describe("Bluetooth printer transport", () => {
  test("treats a cancelled Bluetooth chooser as a cancelled picker", () => {
    expect(
      isPrinterPickerCancelled(
        new Error("User cancelled the requestDevice() chooser."),
      ),
    ).toBe(true);
  });

  test("chunks receipt bytes to the Bluetooth write size", () => {
    const chunks = chunkBluetoothPrinterPayload(new Uint8Array(45), 20);

    expect(chunks.map((chunk) => chunk.length)).toEqual([20, 20, 5]);
  });

  test("writes receipt bytes through a writable Bluetooth characteristic", async () => {
    const written: number[][] = [];
    await writeBluetoothPrinter(
      {
        properties: { writeWithoutResponse: true, write: false },
        writeValueWithoutResponse: async (data) => {
          written.push(Array.from(data));
        },
      },
      new Uint8Array([1, 2, 3, 4, 5]),
      2,
    );

    expect(written).toEqual([[1, 2], [3, 4], [5]]);
  });

  test("selects a writable Bluetooth characteristic from the printer GATT services", async () => {
    const writable = {
      properties: { writeWithoutResponse: true, write: false },
      writeValueWithoutResponse: async () => undefined,
    };
    const characteristic = await findWritableBluetoothCharacteristic({
      getPrimaryServices: async () => [
        {
          getCharacteristics: async () => [
            { properties: { writeWithoutResponse: false, write: false } },
            writable,
          ],
        },
      ],
    });

    expect(characteristic).toBe(writable);
  });

  test("asks Chrome to persist printer permission with filters instead of acceptAllDevices", () => {
    const options = getBluetoothPrinterRequestOptions("58Printer");

    expect(options.acceptAllDevices).toBeUndefined();
    expect(options.filters?.some((filter) => filter.name === "58Printer")).toBe(true);
    expect(options.filters?.some((filter) => filter.namePrefix === "58")).toBe(true);
    expect(options.optionalServices).toContain("000018f0-0000-1000-8000-00805f9b34fb");
  });

  test("keeps a named printer like Seznik_Veer_0101 inside persistable filters", () => {
    const options = getBluetoothPrinterRequestOptions();

    expect(options.acceptAllDevices).toBeUndefined();
    expect(
      bluetoothFiltersMatchDeviceName(options.filters ?? [], "Seznik_Veer_0101"),
    ).toBe(true);
    expect(
      bluetoothFiltersMatchDeviceName(
        getBluetoothPrinterRequestOptions("Seznik_Veer_0101").filters ?? [],
        "Seznik_Veer_0101",
      ),
    ).toBe(true);
  });

  test("falls back to acceptAllDevices when no filtered printer is found", async () => {
    const requested: Array<{ acceptAllDevices?: boolean; filters?: unknown }> = [];
    const fallbackDevice = {
      id: "ble-fallback",
      addEventListener() {},
      removeEventListener() {},
    };
    const device = await requestBluetoothPrinter({
      requestDevice: async (options) => {
        requested.push(options);
        if (options.acceptAllDevices) {
          return fallbackDevice;
        }
        throw new Error("No Bluetooth device found matching the criteria.");
      },
    });

    expect(device).toBe(fallbackDevice);
    expect(requested[0]?.filters).toBeDefined();
    expect(requested[1]).toMatchObject({ acceptAllDevices: true });
  });

  test("does not fall back to acceptAllDevices when reconnecting a remembered named printer", async () => {
    const requested: Array<{ acceptAllDevices?: boolean }> = [];

    await expect(
      requestBluetoothPrinter(
        {
          requestDevice: async (options) => {
            requested.push(options);
            throw new Error("No Bluetooth device found matching the criteria.");
          },
        },
        "Seznik_Veer_0101",
      ),
    ).rejects.toThrow("No Bluetooth device found matching the criteria.");

    expect(requested.every((options) => !options.acceptAllDevices)).toBe(true);
    expect(requested.length).toBeGreaterThanOrEqual(1);
  });
});

describe("remembered Bluetooth printer restore", () => {
  const testWindow = new Window({ url: "http://localhost" });

  Object.assign(globalThis, {
    window: testWindow,
    localStorage: testWindow.localStorage,
  });

  afterEach(() => {
    testWindow.localStorage.clear();
  });

  test("restores a Bluetooth printer by remembered id, then name, then the only permitted device", async () => {
    saveRememberedBluetoothPrinter({
      id: "ble-58printer",
      name: "58Printer",
      addEventListener() {},
      removeEventListener() {},
    });

    const byId = {
      id: "ble-58printer",
      name: "58Printer",
      addEventListener() {},
      removeEventListener() {},
    };
    expect(
      await findRememberedBluetoothPrinter({
        requestDevice: async () => byId,
        getDevices: async () => [{ id: "other" }, byId],
      }),
    ).toBe(byId);

    const byName = {
      id: "ble-renamed-id",
      name: "58Printer",
      addEventListener() {},
      removeEventListener() {},
    };
    expect(
      await findRememberedBluetoothPrinter({
        requestDevice: async () => byName,
        getDevices: async () => [byName],
      }),
    ).toBe(byName);

    const onlyDevice = {
      id: "ble-only",
      name: "POS-80",
      addEventListener() {},
      removeEventListener() {},
    };
    testWindow.localStorage.setItem(
      "hisab_pos_usb_printer",
      JSON.stringify({ transport: "bluetooth", deviceId: "missing", name: "Gone" }),
    );
    expect(
      await findRememberedBluetoothPrinter({
        requestDevice: async () => onlyDevice,
        getDevices: async () => [onlyDevice],
      }),
    ).toBe(onlyDevice);
  });

  test("explains when Chrome has no permitted Bluetooth devices to restore", async () => {
    saveRememberedBluetoothPrinter({
      id: "ble-seznik",
      name: "Seznik_Veer_0101",
      addEventListener() {},
      removeEventListener() {},
    });

    const diagnosis = await diagnoseBluetoothPrinterRestore({
      requestDevice: async () => {
        throw new Error("chooser");
      },
      getDevices: async () => [],
    });

    expect(diagnosis.reason).toBe("no-permitted-devices");
    expect(diagnosis.remembered).toEqual({
      deviceId: "ble-seznik",
      name: "Seznik_Veer_0101",
    });
    expect(describeBluetoothRestoreReason(diagnosis)).toContain("0 permitted Bluetooth devices");
  });

  test("explains when Chrome cannot restore Bluetooth because getDevices is missing", async () => {
    saveRememberedBluetoothPrinter({
      id: "ble-seznik",
      name: "Seznik_Veer_0101",
      addEventListener() {},
      removeEventListener() {},
    });

    const diagnosis = await diagnoseBluetoothPrinterRestore({
      requestDevice: async () => {
        throw new Error("chooser");
      },
    });

    expect(diagnosis.reason).toBe("get-devices-unavailable");
    expect(describeBluetoothRestoreReason(diagnosis)).toContain("cannot restore Bluetooth after reload");
    expect(
      inspectBluetoothManagerCapabilities({ requestDevice: async () => undefined }).hasGetDevices,
    ).toBe(false);
  });

  test("falls back to the first permitted Bluetooth device when the saved id is gone", async () => {
    testWindow.localStorage.setItem(
      "hisab_pos_usb_printer",
      JSON.stringify({ transport: "bluetooth", deviceId: "missing", name: "Gone" }),
    );
    const first = {
      id: "ble-first",
      name: "Seznik_Veer_0101",
      addEventListener() {},
      removeEventListener() {},
    };
    const second = {
      id: "ble-second",
      name: "Other",
      addEventListener() {},
      removeEventListener() {},
    };

    expect(
      await findRememberedBluetoothPrinter({
        requestDevice: async () => first,
        getDevices: async () => [first, second],
      }),
    ).toBe(first);
  });

  test("retries a transient GATT connect failure", async () => {
    let attempts = 0;
    const characteristic = {
      properties: { write: true },
      writeValue: async () => undefined,
    };
    const connectedServer = {
      connected: true,
      connect: async () => connectedServer,
      disconnect: () => undefined,
      getPrimaryServices: async () => [
        { getCharacteristics: async () => [characteristic] },
      ],
    };
    const prepared = await connectBluetoothPrinterWithRetry(
      {
        id: "ble-seznik",
        name: "Seznik_Veer_0101",
        gatt: {
          connected: false,
          connect: async () => {
            attempts += 1;
            if (attempts < 2) {
              throw new Error("GATT Error: Not connected.");
            }
            return connectedServer;
          },
          disconnect: () => undefined,
          getPrimaryServices: async () => [],
        },
        addEventListener() {},
        removeEventListener() {},
      },
      3,
    );

    expect(attempts).toBe(2);
    expect(prepared.characteristic).toBe(characteristic);
  });
});
