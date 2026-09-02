import { describe, expect, test } from "bun:test";
import {
  CreateAddOnSchema,
  CreateBundleProductSchema,
  CreateComboProductSchema,
  CreateLabelTemplateSchema,
  CreateProductAddOnAttachmentSchema,
  CreateProductSchema,
  ProductDTOSchema,
  ProductResponseDTOSchema,
  UpdateAddOnSchema,
  UpdateBundleProductSchema,
  UpdateLabelTemplateSchema,
  UpdateProductAddOnAttachmentSchema,
  UpdateProductSchema,
} from "./catalog.schema";
import {
  keepOutsFromContentInset,
  leftoverPrintableBox,
  mapLabelElementsIntoBox,
} from "./label-template-geometry";
import {
  A4_SHEET_LABEL_TEMPLATE,
  THERMAL_ROLL_LABEL_TEMPLATE,
} from "./seeded-label-templates";

describe("Add-On catalog contracts", () => {
  test("create add-on accepts name, price, discount, and status", () => {
    const result = CreateAddOnSchema.safeParse({
      name: "Extra Cheese",
      price: 20,
      discount: 2,
      status: "active",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Extra Cheese");
      expect(result.data.price).toBe(20);
      expect(result.data.discount).toBe(2);
    }
  });

  test("update add-on accepts status changes", () => {
    const result = UpdateAddOnSchema.safeParse({ status: "inactive" });

    expect(result.success).toBe(true);
  });

  test("rejects an add-on discount greater than its price", () => {
    const result = CreateAddOnSchema.safeParse({
      name: "Extra cheese",
      price: 10,
      discount: 11,
    });

    expect(result.success).toBe(false);
  });

  test("attachment create defaults selection cap as optional", () => {
    const result = CreateProductAddOnAttachmentSchema.safeParse({
      addOnId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.selectionCap).toBeUndefined();
    }
  });

  test("rejects selection cap below 1", () => {
    const result = CreateProductAddOnAttachmentSchema.safeParse({
      addOnId: "11111111-1111-4111-8111-111111111111",
      selectionCap: 0,
    });

    expect(result.success).toBe(false);
  });

  test("rejects fractional selection cap", () => {
    const result = UpdateProductAddOnAttachmentSchema.safeParse({
      selectionCap: 1.5,
    });

    expect(result.success).toBe(false);
  });

  test("rejects negative selection cap", () => {
    const result = UpdateProductAddOnAttachmentSchema.safeParse({
      selectionCap: -2,
    });

    expect(result.success).toBe(false);
  });
});

describe("Bundle Product catalog contracts", () => {
  test("create bundle accepts typed identity fields and product components", () => {
    const result = CreateBundleProductSchema.safeParse({
      categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      name: "Burger Combo",
      price: 99,
      discount: 0,
      components: [
        {
          productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          quantity: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.components).toHaveLength(1);
      expect(result.data.components[0]?.quantity).toBe(1);
    }
  });

  test("create bundle accepts parent-scoped add-ons under product components", () => {
    const result = CreateBundleProductSchema.safeParse({
      categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      name: "Burger Combo",
      price: 99,
      components: [
        {
          productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          quantity: 1,
          addOns: [
            {
              addOnId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
              quantity: 1,
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.components[0]?.addOns).toHaveLength(1);
      expect(result.data.components[0]?.addOns?.[0]?.quantity).toBe(1);
    }
  });

  test("rejects bundle create without product components", () => {
    const result = CreateBundleProductSchema.safeParse({
      categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      name: "Empty Bundle",
      price: 99,
      components: [],
    });

    expect(result.success).toBe(false);
  });

  test("rejects fractional component quantity", () => {
    const result = CreateBundleProductSchema.safeParse({
      categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      name: "Burger Combo",
      price: 99,
      components: [
        {
          productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          quantity: 1.5,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("rejects fractional nested add-on quantity", () => {
    const result = CreateBundleProductSchema.safeParse({
      categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      name: "Burger Combo",
      price: 99,
      components: [
        {
          productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          quantity: 1,
          addOns: [
            {
              addOnId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
              quantity: 1.5,
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("update bundle accepts status-based retirement", () => {
    const result = UpdateBundleProductSchema.safeParse({ status: "inactive" });

    expect(result.success).toBe(true);
  });
});

describe("Combo Product catalog contracts", () => {
  test("accepts choice groups with option limits and price adjustments", () => {
    const result = CreateComboProductSchema.safeParse({
      categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      name: "Lunch Combo",
      price: 150,
      choiceGroups: [
        {
          name: "Choose a drink",
          minSelections: 1,
          maxSelections: 2,
          options: [
            {
              productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              maxQuantity: 2,
              priceAdjustment: 10,
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("rejects a choice group where minimum exceeds maximum", () => {
    const result = CreateComboProductSchema.safeParse({
      categoryId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      name: "Invalid Combo",
      price: 150,
      choiceGroups: [
        {
          name: "Choose",
          minSelections: 2,
          maxSelections: 1,
          options: [
            {
              productId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              maxQuantity: 1,
              priceAdjustment: 0,
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("Product Code catalog contracts", () => {
  const categoryId = "ffffffff-ffff-4fff-8fff-ffffffffffff";

  test("create product accepts an optional manufacturer product code with kind", () => {
    const result = CreateProductSchema.safeParse({
      categoryId,
      name: "Dairy Milk 20 g",
      price: 20,
      productCode: "7622202334009",
      productCodeKind: "manufacturer",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productCode).toBe("7622202334009");
      expect(result.data.productCodeKind).toBe("manufacturer");
    }
  });

  test("create product preserves leading zeroes and does not trim spaces in product codes", () => {
    const result = CreateProductSchema.safeParse({
      categoryId,
      name: "Opaque Code Product",
      price: 10,
      productCode: " 0123 ",
      productCodeKind: "manufacturer",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productCode).toBe(" 0123 ");
    }
  });

  test("strips only trailing transport terminators before checking product code length", () => {
    const productCode = "A".repeat(128);
    const result = CreateProductSchema.safeParse({
      categoryId,
      name: "Terminated Code Product",
      price: 10,
      productCode: `${productCode}\r\n`,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productCode).toBe(productCode);
    }
  });

  test("create product accepts a product code without kind so the service can default manufacturer", () => {
    const result = CreateProductSchema.safeParse({
      categoryId,
      name: "Coded Product",
      price: 10,
      productCode: "ABC-99",
    });

    expect(result.success).toBe(true);
  });

  test("create product accepts clearing fields as null", () => {
    const result = CreateProductSchema.safeParse({
      categoryId,
      name: "No Code Product",
      price: 10,
      productCode: null,
      productCodeKind: null,
    });

    expect(result.success).toBe(true);
  });

  test("rejects product code kind without a product code", () => {
    const result = CreateProductSchema.safeParse({
      categoryId,
      name: "Invalid",
      price: 10,
      productCodeKind: "manufacturer",
    });

    expect(result.success).toBe(false);
  });

  test("update product accepts clearing a product code", () => {
    const result = UpdateProductSchema.safeParse({
      productCode: null,
      productCodeKind: null,
    });

    expect(result.success).toBe(true);
  });

  test("update product contract carries an internal code request for service authorization", () => {
    const result = UpdateProductSchema.safeParse({
      productCode: "0400000001234",
      productCodeKind: "internal_rcn",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.productCode).toBe("0400000001234");
      expect(result.data.productCodeKind).toBe("internal_rcn");
    }
  });

  test("product DTO requires matching code and kind nullity", () => {
    const base = {
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      organizationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      categoryId,
      name: "Burger",
      sortOrder: 0,
      price: 100,
      discount: 0,
      productType: "single" as const,
      unitId: "99999999-9999-4999-8999-999999999999",
      defaultSellingQuantity: 1,
      allowCustomSellingQuantity: false,
      unitLabel: "pc",
      status: "active" as const,
      createdBy: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      createdAt: new Date("2026-08-10T12:00:00.000Z"),
      updatedAt: new Date("2026-08-10T12:00:00.000Z"),
    };

    expect(
      ProductDTOSchema.safeParse({
        ...base,
        productCode: "7622202334009",
        productCodeKind: "manufacturer",
      }).success,
    ).toBe(true);

    expect(
      ProductDTOSchema.safeParse({
        ...base,
        productCode: null,
        productCodeKind: null,
      }).success,
    ).toBe(true);

    expect(
      ProductDTOSchema.safeParse({
        ...base,
        productCode: "7622202334009",
        productCodeKind: null,
      }).success,
    ).toBe(false);

    expect(
      ProductResponseDTOSchema.safeParse({
        ...base,
        imageSignedUrl: null,
        productCode: "7622202334009",
        productCodeKind: null,
      }).success,
    ).toBe(false);
  });
});

describe("Product selling unit catalog contracts", () => {
  const categoryId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const gramUnitId = "99999999-9999-4999-8999-999999999999";

  test("create product accepts an active Unit and Default Selling Quantity", () => {
    const result = CreateProductSchema.safeParse({
      categoryId,
      name: "Cake",
      price: 250,
      unitId: gramUnitId,
      defaultSellingQuantity: 250,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unitId).toBe(gramUnitId);
      expect(result.data.defaultSellingQuantity).toBe(250);
    }
  });

  test("create product still succeeds when Unit and Default Selling Quantity are omitted", () => {
    const result = CreateProductSchema.safeParse({
      categoryId,
      name: "Water Bottle",
      price: 20,
    });

    expect(result.success).toBe(true);
  });

  test("rejects a Default Selling Quantity that is not positive", () => {
    expect(
      CreateProductSchema.safeParse({
        categoryId,
        name: "Cake",
        price: 250,
        defaultSellingQuantity: 0,
      }).success,
    ).toBe(false);
    expect(
      UpdateProductSchema.safeParse({
        defaultSellingQuantity: -1,
      }).success,
    ).toBe(false);
  });

  test("rejects a Default Selling Quantity with more than two decimal places", () => {
    expect(
      CreateProductSchema.safeParse({
        categoryId,
        name: "Cake",
        price: 250,
        defaultSellingQuantity: 250.125,
      }).success,
    ).toBe(false);
  });

  test("update product accepts Unit or Default Selling Quantity on their own", () => {
    expect(
      UpdateProductSchema.safeParse({ unitId: gramUnitId }).success,
    ).toBe(true);
    expect(
      UpdateProductSchema.safeParse({ defaultSellingQuantity: 0.75 }).success,
    ).toBe(true);
  });
});

describe("Label Template catalog contracts", () => {
  test("create Label Template accepts the seeded A4 sheet design", () => {
    const result = CreateLabelTemplateSchema.safeParse(A4_SHEET_LABEL_TEMPLATE);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("A4 sheet (3 × 8 labels)");
      expect(result.data.stock.media).toBe("sheet");
      expect(result.data.stock.sheet?.columns).toBe(3);
      expect(result.data.stock.sheet?.rows).toBe(8);
      expect(result.data.stock.widthMm).toBe(70);
      expect(result.data.stock.heightMm).toBe(35);
    }
  });

  test("create Label Template accepts the seeded 58×40 mm thermal design", () => {
    const result = CreateLabelTemplateSchema.safeParse(
      THERMAL_ROLL_LABEL_TEMPLATE,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Thermal label (58 × 40 mm)");
      expect(result.data.stock.media).toBe("roll");
      expect(result.data.stock.widthMm).toBe(58);
      expect(result.data.stock.heightMm).toBe(40);
      expect(result.data.stock.labelsPerRow).toBe(1);
      expect(result.data.stock.sheet).toBeUndefined();
    }
  });

  test("rejects an empty Label Template name", () => {
    const result = CreateLabelTemplateSchema.safeParse({
      ...A4_SHEET_LABEL_TEMPLATE,
      name: "   ",
    });

    expect(result.success).toBe(false);
  });

  test("rejects unknown Label Element bindings", () => {
    const firstElement = A4_SHEET_LABEL_TEMPLATE.elements[0];
    if (!firstElement || firstElement.type !== "text") {
      throw new Error("The seeded A4 template must start with a text element");
    }

    const result = CreateLabelTemplateSchema.safeParse({
      ...A4_SHEET_LABEL_TEMPLATE,
      elements: [
        {
          ...firstElement,
          text: {
            ...firstElement.text,
            binding: "product.unknownField",
          },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  test("rejects invalid millimetre Label Stock", () => {
    const result = CreateLabelTemplateSchema.safeParse({
      ...THERMAL_ROLL_LABEL_TEMPLATE,
      stock: {
        ...THERMAL_ROLL_LABEL_TEMPLATE.stock,
        widthMm: 0,
      },
    });

    expect(result.success).toBe(false);
  });

  test("update Label Template accepts deactivation", () => {
    const result = UpdateLabelTemplateSchema.safeParse({ status: "inactive" });

    expect(result.success).toBe(true);
  });

  test("content-inset helper creates Keep-Out rectangles for a branded header", () => {
    expect(
      keepOutsFromContentInset(
        { widthMm: 50, heightMm: 40 },
        { topMm: 12, rightMm: 0, bottomMm: 0, leftMm: 0 },
      ),
    ).toEqual([{ xMm: 0, yMm: 0, widthMm: 50, heightMm: 12 }]);
  });

  test("content-inset helper creates Keep-Outs on each reserved side", () => {
    expect(
      keepOutsFromContentInset(
        { widthMm: 50, heightMm: 40 },
        { topMm: 12, rightMm: 5, bottomMm: 3, leftMm: 4 },
      ),
    ).toEqual([
      { xMm: 0, yMm: 0, widthMm: 50, heightMm: 12 },
      { xMm: 45, yMm: 0, widthMm: 5, heightMm: 40 },
      { xMm: 0, yMm: 37, widthMm: 50, heightMm: 3 },
      { xMm: 0, yMm: 0, widthMm: 4, heightMm: 40 },
    ]);
  });

  test("create Label Template accepts 2-across roll Label Stock with millimetre gaps", () => {
    const result = CreateLabelTemplateSchema.safeParse({
      ...THERMAL_ROLL_LABEL_TEMPLATE,
      name: "Two-across roll",
      stock: {
        widthMm: 40,
        heightMm: 30,
        labelsPerRow: 2,
        horizontalGapMm: 2,
        verticalGapMm: 3,
        media: "roll",
      },
      elements: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stock.labelsPerRow).toBe(2);
      expect(result.data.stock.horizontalGapMm).toBe(2);
      expect(result.data.stock.verticalGapMm).toBe(3);
      expect(result.data.stock.media).toBe("roll");
    }
  });

  test("create Label Template accepts sheet Label Stock with a page grid and gaps", () => {
    const result = CreateLabelTemplateSchema.safeParse({
      ...A4_SHEET_LABEL_TEMPLATE,
      name: "Custom sheet",
      stock: {
        widthMm: 60,
        heightMm: 40,
        labelsPerRow: 2,
        horizontalGapMm: 4,
        verticalGapMm: 3,
        media: "sheet",
        sheet: {
          pageWidthMm: 210,
          pageHeightMm: 297,
          columns: 2,
          rows: 6,
        },
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stock.sheet).toEqual({
        pageWidthMm: 210,
        pageHeightMm: 297,
        columns: 2,
        rows: 6,
      });
      expect(result.data.stock.horizontalGapMm).toBe(4);
    }
  });

  test("rejects a Label Element that intersects a Keep-Out", () => {
    const result = CreateLabelTemplateSchema.safeParse({
      ...THERMAL_ROLL_LABEL_TEMPLATE,
      keepOuts: keepOutsFromContentInset(THERMAL_ROLL_LABEL_TEMPLATE.stock, {
        topMm: 12,
        rightMm: 0,
        bottomMm: 0,
        leftMm: 0,
      }),
    });

    expect(result.success).toBe(false);
  });

  test("accepts a Keep-Out that touches but does not overlap a Label Element", () => {
    const result = CreateLabelTemplateSchema.safeParse({
      ...THERMAL_ROLL_LABEL_TEMPLATE,
      keepOuts: [{ xMm: 0, yMm: 0, widthMm: 2, heightMm: 40 }],
    });

    expect(result.success).toBe(true);
  });

  test("rejects a Keep-Out that does not fit on the Label Stock", () => {
    const result = CreateLabelTemplateSchema.safeParse({
      ...THERMAL_ROLL_LABEL_TEMPLATE,
      keepOuts: [{ xMm: 50, yMm: 0, widthMm: 20, heightMm: 10 }],
    });

    expect(result.success).toBe(false);
  });

  test("content inset leftover is the printable area below a branded header", () => {
    const stock = { widthMm: 38, heightMm: 50 };
    const keepOuts = keepOutsFromContentInset(stock, {
      topMm: 20,
      rightMm: 0,
      bottomMm: 0,
      leftMm: 0,
    });

    expect(leftoverPrintableBox(stock, keepOuts)).toEqual({
      xMm: 0,
      yMm: 20,
      widthMm: 38,
      heightMm: 30,
    });
  });

  test("mapped Label Elements sit in leftover space and do not intersect a header Keep-Out", () => {
    const stock = { widthMm: 38, heightMm: 50 };
    const keepOuts = keepOutsFromContentInset(stock, {
      topMm: 20,
      rightMm: 0,
      bottomMm: 0,
      leftMm: 0,
    });
    const leftover = leftoverPrintableBox(stock, keepOuts);
    const elements = mapLabelElementsIntoBox(
      THERMAL_ROLL_LABEL_TEMPLATE.elements,
      THERMAL_ROLL_LABEL_TEMPLATE.stock,
      leftover,
    );
    const result = CreateLabelTemplateSchema.safeParse({
      name: "Branded roll",
      status: "active",
      stock: {
        ...stock,
        labelsPerRow: 2,
        horizontalGapMm: 2,
        verticalGapMm: 2,
        media: "roll",
      },
      keepOuts,
      elements,
    });

    expect(leftover).toEqual({ xMm: 0, yMm: 20, widthMm: 38, heightMm: 30 });
    expect(result.success).toBe(true);
    expect(elements[0]?.yMm).toBeGreaterThanOrEqual(20);
  });

  test("create Label Template accepts composed catalog bindings with no mandatory Element", () => {
    const result = CreateLabelTemplateSchema.safeParse({
      ...THERMAL_ROLL_LABEL_TEMPLATE,
      name: "Packaging leftover",
      keepOuts: [{ xMm: 0, yMm: 0, widthMm: 58, heightMm: 12 }],
      elements: [
        {
          id: "product-name",
          type: "text",
          xMm: 2,
          yMm: 14,
          widthMm: 54,
          heightMm: 6,
          rotationDeg: 0,
          text: {
            source: "binding",
            binding: "product.name",
            fontSizeMm: 2.5,
            fontWeight: "bold",
            align: "left",
          },
        },
        {
          id: "static-taxes",
          type: "text",
          xMm: 2,
          yMm: 21,
          widthMm: 20,
          heightMm: 4,
          rotationDeg: 90,
          text: {
            source: "static",
            staticValue: "Inc. of all Taxes",
            fontSizeMm: 2,
            fontWeight: "normal",
            align: "left",
          },
        },
        {
          id: "product-code-barcode",
          type: "barcode",
          xMm: 24,
          yMm: 14,
          widthMm: 10,
          heightMm: 24,
          rotationDeg: 90,
          barcode: {
            symbology: "code128",
            showHumanDigits: true,
          },
        },
        {
          id: "price-frame",
          type: "box",
          xMm: 36,
          yMm: 14,
          widthMm: 20,
          heightMm: 10,
          rotationDeg: 0,
          box: { strokeWidthMm: 0.4 },
        },
        {
          id: "selling-price",
          type: "text",
          xMm: 38,
          yMm: 16,
          widthMm: 16,
          heightMm: 6,
          rotationDeg: 0,
          text: {
            source: "binding",
            binding: "product.price",
            fontSizeMm: 2.5,
            fontWeight: "bold",
            align: "center",
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  test("create Label Template accepts a design with no Label Elements", () => {
    const result = CreateLabelTemplateSchema.safeParse({
      ...THERMAL_ROLL_LABEL_TEMPLATE,
      name: "Blank leftover",
      elements: [],
    });

    expect(result.success).toBe(true);
  });
});
