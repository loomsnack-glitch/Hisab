import { describe, expect, test } from "bun:test";
import { PaymentMethodSchema } from "../billing/billing.schema";
import {
  CreateMoneyAccountSchema,
  MONEY_ACCOUNT_NAME_MAX_LENGTH,
  MONEY_ACCOUNT_NOTES_MAX_LENGTH,
  MONEY_ACCOUNT_PAYMENT_ROUTE_METHOD_LABELS,
  MONEY_ACCOUNT_SCOPE_LABELS,
  MONEY_ACCOUNT_TYPE_LABELS,
  MoneyAccountDTOSchema,
  MoneyAccountHistoryResponseSchema,
  MoneyAccountMovementDTOSchema,
  MoneyAccountPaymentRouteDTOSchema,
  ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS,
  ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPES,
  UpdateMoneyAccountSchema,
  UpsertMoneyAccountPaymentRouteSchema,
} from "./money-accounts.schema";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const moneyAccountId = "11111111-1111-4111-8111-111111111111";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const validCreate = {
  name: "HDFC Current",
  type: "bank" as const,
  notes: "Main operating account",
  status: "active" as const,
};

const organizationWideDto = {
  id: moneyAccountId,
  organizationId,
  name: "HDFC Current",
  type: "bank" as const,
  scope: "organization_wide" as const,
  storeId: null,
  notes: "Main operating account",
  status: "active" as const,
  openingBalance: 0,
  balance: 0,
  hasMovements: false,
  createdBy: userId,
  updatedBy: null,
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

describe("Money Account contracts", () => {
  test("create Money Account accepts a name, Organization-wide type, optional notes, and optional status", () => {
    const result = CreateMoneyAccountSchema.safeParse(validCreate);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("HDFC Current");
      expect(result.data.type).toBe("bank");
      expect(result.data.notes).toBe("Main operating account");
      expect(result.data.status).toBe("active");
    }
  });

  test("create Money Account trims name and notes", () => {
    const result = CreateMoneyAccountSchema.safeParse({
      name: "  HDFC Current  ",
      type: "bank",
      notes: "  Main operating account  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("HDFC Current");
      expect(result.data.notes).toBe("Main operating account");
    }
  });

  test("create Money Account defaults status as optional", () => {
    const result = CreateMoneyAccountSchema.safeParse({
      name: "HDFC Current",
      type: "bank",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  test("create Money Account accepts a blank notes value", () => {
    const result = CreateMoneyAccountSchema.safeParse({
      name: "HDFC Current",
      type: "bank",
      notes: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("");
    }
  });

  test("create Money Account accepts every Organization-wide type", () => {
    for (const type of ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPES) {
      const result = CreateMoneyAccountSchema.safeParse({
        name: ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS[type],
        type,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(type);
      }
    }
  });

  test("create Money Account accepts an explicit Organization-wide scope without a Store", () => {
    const result = CreateMoneyAccountSchema.safeParse({
      ...validCreate,
      scope: "organization_wide",
      storeId: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe("organization_wide");
      expect(result.data.storeId).toBeNull();
    }
  });

  test("create Money Account accepts Store-scoped configuration with exactly one Store", () => {
    const result = CreateMoneyAccountSchema.safeParse({
      name: "Adajan UPI QR",
      type: "upi",
      scope: "store_scoped",
      storeId,
      notes: "Counter QR",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe("store_scoped");
      expect(result.data.storeId).toBe(storeId);
      expect(result.data.type).toBe("upi");
    }
  });

  test("create Money Account accepts every eligible non-cash type as Store-scoped", () => {
    for (const type of ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPES) {
      const result = CreateMoneyAccountSchema.safeParse({
        name: `${ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS[type]} at store`,
        type,
        scope: "store_scoped",
        storeId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.scope).toBe("store_scoped");
        expect(result.data.storeId).toBe(storeId);
      }
    }
  });

  test("rejects a Money Account without a name", () => {
    expect(CreateMoneyAccountSchema.safeParse({ type: "bank" }).success).toBe(false);
  });

  test("rejects a Money Account without a type", () => {
    expect(CreateMoneyAccountSchema.safeParse({ name: "HDFC Current" }).success).toBe(false);
  });

  test("rejects a blank Money Account name after trim", () => {
    expect(CreateMoneyAccountSchema.safeParse({ name: "   ", type: "bank" }).success).toBe(false);
  });

  test("rejects a name longer than the allowed length", () => {
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "a".repeat(MONEY_ACCOUNT_NAME_MAX_LENGTH + 1),
        type: "bank",
      }).success,
    ).toBe(false);
  });

  test("rejects notes longer than the allowed length", () => {
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "HDFC Current",
        type: "bank",
        notes: "a".repeat(MONEY_ACCOUNT_NOTES_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  test("create Money Account accepts a Store-scoped Cash account with a Store", () => {
    const result = CreateMoneyAccountSchema.safeParse({
      name: "Adajan cash",
      type: "cash",
      scope: "store_scoped",
      storeId,
      notes: "Physical till",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("cash");
      expect(result.data.scope).toBe("store_scoped");
      expect(result.data.storeId).toBe(storeId);
    }
  });

  test("create Money Account accepts an inactive Store-scoped Cash account", () => {
    const result = CreateMoneyAccountSchema.safeParse({
      name: "Old till",
      type: "cash",
      scope: "store_scoped",
      storeId,
      status: "inactive",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("inactive");
    }
  });

  test("rejects Cash as an Organization-wide Money Account type", () => {
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "Store cash",
        type: "cash",
      }).success,
    ).toBe(false);
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "Store cash",
        type: "cash",
        scope: "organization_wide",
      }).success,
    ).toBe(false);
    expect(
      UpdateMoneyAccountSchema.safeParse({
        type: "cash",
        scope: "organization_wide",
      }).success,
    ).toBe(false);
  });

  test("rejects a Cash Money Account without a Store", () => {
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "Store cash",
        type: "cash",
        scope: "store_scoped",
      }).success,
    ).toBe(false);
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "Store cash",
        type: "cash",
        scope: "store_scoped",
        storeId: null,
      }).success,
    ).toBe(false);
  });

  test("update Money Account can change a Cash account's status without restating Store scope", () => {
    expect(UpdateMoneyAccountSchema.safeParse({ type: "cash" }).success).toBe(true);
    expect(UpdateMoneyAccountSchema.safeParse({ status: "inactive" }).success).toBe(true);
    expect(UpdateMoneyAccountSchema.safeParse({ status: "active" }).success).toBe(true);
  });

  test("rejects Store assignment and Store-scoped fields without a valid Store", () => {
    expect(
      CreateMoneyAccountSchema.safeParse({
        ...validCreate,
        storeId,
      }).success,
    ).toBe(false);
    expect(
      CreateMoneyAccountSchema.safeParse({
        ...validCreate,
        scope: "store_scoped",
      }).success,
    ).toBe(false);
    expect(
      CreateMoneyAccountSchema.safeParse({
        ...validCreate,
        scope: "store_scoped",
        storeId: null,
      }).success,
    ).toBe(false);
    expect(
      CreateMoneyAccountSchema.safeParse({
        ...validCreate,
        scope: "organization_wide",
        storeId,
      }).success,
    ).toBe(false);
  });

  test("rejects an invalid Store id", () => {
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "Adajan UPI QR",
        type: "upi",
        scope: "store_scoped",
        storeId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  test("rejects sensitive financial identifiers, credentials, and balances", () => {
    const forbiddenFields = {
      bankAccountNumber: "123456789012",
      accountNumber: "123456789012",
      ifsc: "HDFC0001234",
      upiId: "shop@upi",
      terminalId: "TERM-001",
      qrImage: "data:image/png;base64,abc",
      credentials: { pin: "1234" },
      balance: 1000,
      hasMovements: true,
    };

    for (const [field, value] of Object.entries(forbiddenFields)) {
      expect(
        CreateMoneyAccountSchema.safeParse({
          ...validCreate,
          [field]: value,
        }).success,
      ).toBe(false);
      expect(
        UpdateMoneyAccountSchema.safeParse({
          status: "inactive",
          [field]: value,
        }).success,
      ).toBe(false);
    }
  });

  test("update Money Account accepts name, type, notes, and status changes", () => {
    const result = UpdateMoneyAccountSchema.safeParse({
      name: "HDFC Current Co",
      type: "upi",
      notes: "Updated notes",
      status: "inactive",
    });

    expect(result.success).toBe(true);
  });

  test("update Money Account accepts status-only availability changes", () => {
    expect(UpdateMoneyAccountSchema.safeParse({ status: "inactive" }).success).toBe(true);
    expect(UpdateMoneyAccountSchema.safeParse({ status: "active" }).success).toBe(true);
  });

  test("update Money Account can become Store-scoped with a Store", () => {
    const result = UpdateMoneyAccountSchema.safeParse({
      scope: "store_scoped",
      storeId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe("store_scoped");
      expect(result.data.storeId).toBe(storeId);
    }
  });

  test("update Money Account can become Organization-wide and drop its Store assignment", () => {
    const result = UpdateMoneyAccountSchema.safeParse({
      scope: "organization_wide",
      storeId: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe("organization_wide");
      expect(result.data.storeId).toBeNull();
    }
  });

  test("update Money Account can change Store without restating scope", () => {
    expect(UpdateMoneyAccountSchema.safeParse({ storeId }).success).toBe(true);
  });

  test("update Money Account requires at least one field", () => {
    expect(UpdateMoneyAccountSchema.safeParse({}).success).toBe(false);
  });

  test("rejects a delete command field on update", () => {
    expect(
      UpdateMoneyAccountSchema.safeParse({
        status: "inactive",
        deleted: true,
      }).success,
    ).toBe(false);
  });

  test("rejects Store assignment on an Organization-wide update", () => {
    expect(
      UpdateMoneyAccountSchema.safeParse({
        scope: "organization_wide",
        storeId,
        status: "active",
      }).success,
    ).toBe(false);
  });

  test("rejects a Store-scoped update without a Store", () => {
    expect(
      UpdateMoneyAccountSchema.safeParse({
        scope: "store_scoped",
      }).success,
    ).toBe(false);
    expect(
      UpdateMoneyAccountSchema.safeParse({
        scope: "store_scoped",
        storeId: null,
      }).success,
    ).toBe(false);
  });

  test("Money Account DTO includes Organization ownership, type, Organization-wide scope, notes, and status", () => {
    const result = MoneyAccountDTOSchema.safeParse(organizationWideDto);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organizationId).toBe(organizationId);
      expect(result.data.type).toBe("bank");
      expect(result.data.scope).toBe("organization_wide");
      expect(result.data.storeId).toBeNull();
      expect(result.data.notes).toBe("Main operating account");
      expect(result.data.status).toBe("active");
      expect(result.data.openingBalance).toBe(0);
      expect(result.data.balance).toBe(0);
      expect(result.data.hasMovements).toBe(false);
      expect("bankAccountNumber" in result.data).toBe(false);
      expect("upiId" in result.data).toBe(false);
    }
  });

  test("create Money Account accepts a non-negative Opening Balance and omits it as optional", () => {
    const omitted = CreateMoneyAccountSchema.safeParse({
      name: "HDFC Current",
      type: "bank",
    });
    const explicitZero = CreateMoneyAccountSchema.safeParse({
      name: "HDFC Current",
      type: "bank",
      openingBalance: 0,
    });
    const recorded = CreateMoneyAccountSchema.safeParse({
      name: "HDFC Current",
      type: "bank",
      openingBalance: 1250.5,
    });

    expect(omitted.success).toBe(true);
    if (omitted.success) {
      expect(omitted.data.openingBalance).toBeUndefined();
    }
    expect(explicitZero.success).toBe(true);
    if (explicitZero.success) {
      expect(explicitZero.data.openingBalance).toBe(0);
    }
    expect(recorded.success).toBe(true);
    if (recorded.success) {
      expect(recorded.data.openingBalance).toBe(1250.5);
    }
  });

  test("rejects a negative or malformed Opening Balance", () => {
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "HDFC Current",
        type: "bank",
        openingBalance: -0.01,
      }).success,
    ).toBe(false);
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "HDFC Current",
        type: "bank",
        openingBalance: 10.999,
      }).success,
    ).toBe(false);
    expect(
      UpdateMoneyAccountSchema.safeParse({
        openingBalance: -5,
      }).success,
    ).toBe(false);
  });

  test("update Money Account accepts an Opening Balance change", () => {
    const result = UpdateMoneyAccountSchema.safeParse({
      openingBalance: 80,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openingBalance).toBe(80);
    }
  });

  test("Money Account DTO exposes Opening Balance and calculated Balance, initially equal", () => {
    const result = MoneyAccountDTOSchema.safeParse({
      ...organizationWideDto,
      openingBalance: 500,
      balance: 500,
      hasMovements: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openingBalance).toBe(500);
      expect(result.data.balance).toBe(500);
      expect(result.data.hasMovements).toBe(false);
    }
  });

  test("rejects a Money Account DTO without Opening Balance or calculated Balance", () => {
    const { openingBalance: _openingBalance, balance: _balance, hasMovements: _hasMovements, ...withoutBalances } =
      organizationWideDto;

    expect(MoneyAccountDTOSchema.safeParse(withoutBalances).success).toBe(false);
  });

  test("Money Account DTO includes Store-scoped availability and the selected Store", () => {
    const result = MoneyAccountDTOSchema.safeParse({
      ...organizationWideDto,
      name: "Adajan UPI QR",
      type: "upi",
      scope: "store_scoped",
      storeId,
      notes: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe("store_scoped");
      expect(result.data.storeId).toBe(storeId);
      expect(result.data.scope).not.toBe("organization_wide");
      expect(MONEY_ACCOUNT_SCOPE_LABELS[result.data.scope]).toBe("Store-scoped");
    }
  });

  test("Money Account DTO accepts a null notes value", () => {
    const result = MoneyAccountDTOSchema.safeParse({
      ...organizationWideDto,
      notes: null,
      status: "inactive",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeNull();
    }
  });

  test("rejects a Money Account DTO with an invalid organization id", () => {
    const result = MoneyAccountDTOSchema.safeParse({
      ...organizationWideDto,
      organizationId: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });

  test("rejects a Money Account DTO with an invalid scope and Store combination", () => {
    expect(
      MoneyAccountDTOSchema.safeParse({
        ...organizationWideDto,
        scope: "store_scoped",
        storeId: null,
      }).success,
    ).toBe(false);
    expect(
      MoneyAccountDTOSchema.safeParse({
        ...organizationWideDto,
        storeId,
      }).success,
    ).toBe(false);
  });

  test("Money Account DTO accepts a Store-scoped Cash account", () => {
    const result = MoneyAccountDTOSchema.safeParse({
      ...organizationWideDto,
      name: "Adajan cash",
      type: "cash",
      scope: "store_scoped",
      storeId,
      notes: "Physical till",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("cash");
      expect(result.data.scope).toBe("store_scoped");
      expect(result.data.storeId).toBe(storeId);
      expect(MONEY_ACCOUNT_TYPE_LABELS[result.data.type]).toBe("Cash");
    }
  });

  test("rejects an Organization-wide Cash Money Account DTO", () => {
    expect(
      MoneyAccountDTOSchema.safeParse({
        ...organizationWideDto,
        name: "Store cash",
        type: "cash",
      }).success,
    ).toBe(false);
  });

  test("does not replace Billing Payment Method values", () => {
    expect(PaymentMethodSchema.options).toEqual(["cash", "upi", "card", "bank_transfer", "other"]);
  });
});

describe("Payment Routing Rule contracts", () => {
  const validRoute = {
    paymentMethod: "upi" as const,
    moneyAccountId,
  };

  const routeDto = {
    id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    organizationId,
    storeId,
    paymentMethod: "upi" as const,
    moneyAccountId,
    createdBy: userId,
    updatedBy: null,
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
  };

  test("accepts a UPI or Card route to one Money Account", () => {
    const upi = UpsertMoneyAccountPaymentRouteSchema.safeParse(validRoute);
    const card = UpsertMoneyAccountPaymentRouteSchema.safeParse({
      paymentMethod: "card",
      moneyAccountId,
    });

    expect(upi.success).toBe(true);
    if (upi.success) {
      expect(upi.data.paymentMethod).toBe("upi");
      expect(upi.data.moneyAccountId).toBe(moneyAccountId);
    }
    expect(card.success).toBe(true);
    if (card.success) {
      expect(card.data.paymentMethod).toBe("card");
    }
    expect(MONEY_ACCOUNT_PAYMENT_ROUTE_METHOD_LABELS.upi).toBe("UPI");
    expect(MONEY_ACCOUNT_PAYMENT_ROUTE_METHOD_LABELS.card).toBe("Card");
  });

  test("rejects Cash, Bank Transfer, Other, and unknown payment methods", () => {
    expect(
      UpsertMoneyAccountPaymentRouteSchema.safeParse({
        paymentMethod: "cash",
        moneyAccountId,
      }).success,
    ).toBe(false);
    expect(
      UpsertMoneyAccountPaymentRouteSchema.safeParse({
        paymentMethod: "bank_transfer",
        moneyAccountId,
      }).success,
    ).toBe(false);
    expect(
      UpsertMoneyAccountPaymentRouteSchema.safeParse({
        paymentMethod: "other",
        moneyAccountId,
      }).success,
    ).toBe(false);
    expect(
      UpsertMoneyAccountPaymentRouteSchema.safeParse({
        paymentMethod: "wallet",
        moneyAccountId,
      }).success,
    ).toBe(false);
  });

  test("rejects a missing or invalid Money Account id", () => {
    expect(UpsertMoneyAccountPaymentRouteSchema.safeParse({ paymentMethod: "upi" }).success).toBe(
      false,
    );
    expect(
      UpsertMoneyAccountPaymentRouteSchema.safeParse({
        paymentMethod: "upi",
        moneyAccountId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });

  test("rejects forbidden fields on a Payment Routing Rule", () => {
    const forbiddenFields = {
      cash: true,
      balance: 100,
      runningBalance: 100,
      paymentId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      sourceKind: "manual",
    };

    for (const [field, value] of Object.entries(forbiddenFields)) {
      expect(
        UpsertMoneyAccountPaymentRouteSchema.safeParse({
          ...validRoute,
          [field]: value,
        }).success,
      ).toBe(false);
    }
  });

  test("Payment Routing Rule DTO includes Store, method, and destination Money Account", () => {
    const result = MoneyAccountPaymentRouteDTOSchema.safeParse(routeDto);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.storeId).toBe(storeId);
      expect(result.data.paymentMethod).toBe("upi");
      expect(result.data.moneyAccountId).toBe(moneyAccountId);
    }
  });
});

describe("Money Account Movement and history contracts", () => {
  const paymentId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const saleId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const movementId = "99999999-9999-4999-8999-999999999999";

  const movementDto = {
    id: movementId,
    organizationId,
    moneyAccountId,
    storeId,
    amount: 250.5,
    occurredAt: "2026-08-31T12:00:00.000Z",
    sourceKind: "pos_payment" as const,
    paymentId,
    outgoingPaymentId: null,
    reversedMovementId: null,
    createdAt: "2026-08-31T12:00:00.000Z",
  };

  test("Money Account Movement DTO records a positive POS Payment link without a running balance", () => {
    const result = MoneyAccountMovementDTOSchema.safeParse(movementDto);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(250.5);
      expect(result.data.sourceKind).toBe("pos_payment");
      expect(result.data.paymentId).toBe(paymentId);
      expect("balanceAfter" in result.data).toBe(false);
      expect("runningBalance" in result.data).toBe(false);
    }
  });

  test("rejects a zero, negative, or malformed Movement amount", () => {
    expect(MoneyAccountMovementDTOSchema.safeParse({ ...movementDto, amount: 0 }).success).toBe(
      false,
    );
    expect(MoneyAccountMovementDTOSchema.safeParse({ ...movementDto, amount: -10 }).success).toBe(
      false,
    );
    expect(MoneyAccountMovementDTOSchema.safeParse({ ...movementDto, amount: 1.234 }).success).toBe(
      false,
    );
  });

  test("rejects a Movement without a unique Payment link or with a non-POS source", () => {
    const { paymentId: _paymentId, ...withoutPayment } = movementDto;
    expect(MoneyAccountMovementDTOSchema.safeParse(withoutPayment).success).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({ ...movementDto, paymentId: null }).success,
    ).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({ ...movementDto, sourceKind: "manual" }).success,
    ).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({ ...movementDto, paymentId: "not-a-uuid" }).success,
    ).toBe(false);
  });

  test("Money Account Movement DTO records a negative bill-edit reversal linked to the original Movement", () => {
    const result = MoneyAccountMovementDTOSchema.safeParse({
      ...movementDto,
      amount: -250.5,
      sourceKind: "sale_replacement_reversal",
      paymentId: null,
      outgoingPaymentId: null,
      reversedMovementId: movementId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(-250.5);
      expect(result.data.sourceKind).toBe("sale_replacement_reversal");
      expect(result.data.paymentId).toBeNull();
      expect(result.data.reversedMovementId).toBe(movementId);
    }
  });

  test("rejects a bill-edit reversal that is positive, reuses a Payment id, or omits the original Movement", () => {
    const reversal = {
      ...movementDto,
      amount: -250.5,
      sourceKind: "sale_replacement_reversal" as const,
      paymentId: null,
      reversedMovementId: movementId,
    };

    expect(MoneyAccountMovementDTOSchema.safeParse({ ...reversal, amount: 250.5 }).success).toBe(
      false,
    );
    expect(
      MoneyAccountMovementDTOSchema.safeParse({ ...reversal, paymentId }).success,
    ).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({ ...reversal, reversedMovementId: null }).success,
    ).toBe(false);
  });

  test("Money Account Movement DTO records a negative Purchase payment linked to an Outgoing Payment", () => {
    const outgoingPaymentId = "12121212-1212-4121-8121-121212121212";
    const result = MoneyAccountMovementDTOSchema.safeParse({
      ...movementDto,
      amount: -40,
      sourceKind: "outgoing_purchase_payment",
      paymentId: null,
      outgoingPaymentId,
      reversedMovementId: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(-40);
      expect(result.data.sourceKind).toBe("outgoing_purchase_payment");
      expect(result.data.outgoingPaymentId).toBe(outgoingPaymentId);
      expect(result.data.paymentId).toBeNull();
    }
  });

  test("Money Account Movement DTO records a negative Expense payment linked to an Outgoing Payment", () => {
    const outgoingPaymentId = "12121212-1212-4121-8121-121212121212";
    const result = MoneyAccountMovementDTOSchema.safeParse({
      ...movementDto,
      amount: -2500,
      sourceKind: "outgoing_expense_payment",
      paymentId: null,
      outgoingPaymentId,
      reversedMovementId: null,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(-2500);
      expect(result.data.sourceKind).toBe("outgoing_expense_payment");
      expect(result.data.outgoingPaymentId).toBe(outgoingPaymentId);
      expect(result.data.paymentId).toBeNull();
    }
  });

  test("rejects an Expense payment Movement that is positive, reuses a POS Payment id, or omits the Outgoing Payment", () => {
    const outbound = {
      ...movementDto,
      amount: -40,
      sourceKind: "outgoing_expense_payment" as const,
      paymentId: null,
      outgoingPaymentId: "12121212-1212-4121-8121-121212121212",
      reversedMovementId: null,
    };

    expect(MoneyAccountMovementDTOSchema.safeParse({ ...outbound, amount: 40 }).success).toBe(false);
    expect(MoneyAccountMovementDTOSchema.safeParse({ ...outbound, paymentId }).success).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({ ...outbound, outgoingPaymentId: null }).success,
    ).toBe(false);
  });

  test("rejects a Purchase payment Movement that is positive, reuses a POS Payment id, or omits the Outgoing Payment", () => {
    const outbound = {
      ...movementDto,
      amount: -40,
      sourceKind: "outgoing_purchase_payment" as const,
      paymentId: null,
      outgoingPaymentId: "12121212-1212-4121-8121-121212121212",
      reversedMovementId: null,
    };

    expect(MoneyAccountMovementDTOSchema.safeParse({ ...outbound, amount: 40 }).success).toBe(false);
    expect(MoneyAccountMovementDTOSchema.safeParse({ ...outbound, paymentId }).success).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({ ...outbound, outgoingPaymentId: null }).success,
    ).toBe(false);
  });

  test("Money Account Movement DTO records a positive Purchase payment reversal linked to the original Movement", () => {
    const result = MoneyAccountMovementDTOSchema.safeParse({
      ...movementDto,
      amount: 40,
      sourceKind: "outgoing_purchase_payment_reversal",
      paymentId: null,
      outgoingPaymentId: null,
      reversedMovementId: movementId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(40);
      expect(result.data.sourceKind).toBe("outgoing_purchase_payment_reversal");
      expect(result.data.reversedMovementId).toBe(movementId);
      expect(result.data.outgoingPaymentId).toBeNull();
      expect(result.data.paymentId).toBeNull();
    }
  });

  test("Money Account Movement DTO records a positive Purchase void reversal linked to the original Movement", () => {
    const result = MoneyAccountMovementDTOSchema.safeParse({
      ...movementDto,
      amount: 40,
      sourceKind: "outgoing_purchase_void_reversal",
      paymentId: null,
      outgoingPaymentId: null,
      reversedMovementId: movementId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceKind).toBe("outgoing_purchase_void_reversal");
      expect(result.data.amount).toBe(40);
      expect(result.data.reversedMovementId).toBe(movementId);
    }
  });

  test("rejects a Purchase payment or void reversal that is negative, reuses a payment id, or omits the original Movement", () => {
    const reversal = {
      ...movementDto,
      amount: 40,
      sourceKind: "outgoing_purchase_payment_reversal" as const,
      paymentId: null,
      outgoingPaymentId: null,
      reversedMovementId: movementId,
    };

    expect(MoneyAccountMovementDTOSchema.safeParse({ ...reversal, amount: -40 }).success).toBe(
      false,
    );
    expect(
      MoneyAccountMovementDTOSchema.safeParse({
        ...reversal,
        outgoingPaymentId: "12121212-1212-4121-8121-121212121212",
      }).success,
    ).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({ ...reversal, reversedMovementId: null }).success,
    ).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({
        ...reversal,
        sourceKind: "outgoing_purchase_void_reversal",
        amount: -40,
      }).success,
    ).toBe(false);
  });

  test("Money Account Movement DTO records a positive Expense payment reversal linked to the original Movement", () => {
    const result = MoneyAccountMovementDTOSchema.safeParse({
      ...movementDto,
      amount: 40,
      sourceKind: "outgoing_expense_payment_reversal",
      paymentId: null,
      outgoingPaymentId: null,
      reversedMovementId: movementId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(40);
      expect(result.data.sourceKind).toBe("outgoing_expense_payment_reversal");
      expect(result.data.reversedMovementId).toBe(movementId);
      expect(result.data.outgoingPaymentId).toBeNull();
      expect(result.data.paymentId).toBeNull();
    }
  });

  test("Money Account Movement DTO records a positive Expense void reversal linked to the original Movement", () => {
    const result = MoneyAccountMovementDTOSchema.safeParse({
      ...movementDto,
      amount: 40,
      sourceKind: "outgoing_expense_void_reversal",
      paymentId: null,
      outgoingPaymentId: null,
      reversedMovementId: movementId,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceKind).toBe("outgoing_expense_void_reversal");
      expect(result.data.amount).toBe(40);
      expect(result.data.reversedMovementId).toBe(movementId);
    }
  });

  test("rejects an Expense payment or void reversal that is negative, reuses a payment id, or omits the original Movement", () => {
    const reversal = {
      ...movementDto,
      amount: 40,
      sourceKind: "outgoing_expense_payment_reversal" as const,
      paymentId: null,
      outgoingPaymentId: null,
      reversedMovementId: movementId,
    };

    expect(MoneyAccountMovementDTOSchema.safeParse({ ...reversal, amount: -40 }).success).toBe(
      false,
    );
    expect(
      MoneyAccountMovementDTOSchema.safeParse({
        ...reversal,
        outgoingPaymentId: "12121212-1212-4121-8121-121212121212",
      }).success,
    ).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({ ...reversal, reversedMovementId: null }).success,
    ).toBe(false);
    expect(
      MoneyAccountMovementDTOSchema.safeParse({
        ...reversal,
        sourceKind: "outgoing_expense_void_reversal",
        amount: -40,
      }).success,
    ).toBe(false);
  });

  test("account history includes a stable Opening Balance entry plus payment-linked Movement entries", () => {
    const result = MoneyAccountHistoryResponseSchema.safeParse({
      moneyAccount: {
        ...organizationWideDto,
        openingBalance: 100,
        balance: 350.5,
        hasMovements: true,
      },
      openingBalance: 100,
      balance: 350.5,
      entries: [
        {
          kind: "opening_balance",
          amount: 100,
          occurredAt: organizationWideDto.createdAt,
        },
        {
          kind: "pos_payment",
          id: movementId,
          amount: 250.5,
          occurredAt: "2026-08-31T12:00:00.000Z",
          storeId,
          paymentId,
          saleId,
          saleNumber: "12",
          paymentMethod: "upi",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openingBalance).toBe(100);
      expect(result.data.balance).toBe(350.5);
      expect(result.data.entries[0]?.kind).toBe("opening_balance");
      expect(result.data.entries[0]?.amount).toBe(100);
      expect(result.data.entries[1]?.kind).toBe("pos_payment");
      if (result.data.entries[1]?.kind === "pos_payment") {
        expect(result.data.entries[1].saleNumber).toBe("12");
        expect(result.data.entries[1].paymentMethod).toBe("upi");
        expect(result.data.entries[1].paymentId).toBe(paymentId);
        expect(result.data.entries[1].saleId).toBe(saleId);
      }
    }
  });

  test("account history includes a bill-edit reversal as a dedicated negative entry", () => {
    const result = MoneyAccountHistoryResponseSchema.safeParse({
      moneyAccount: {
        ...organizationWideDto,
        openingBalance: 5,
        balance: 50,
        hasMovements: true,
      },
      openingBalance: 5,
      balance: 50,
      entries: [
        {
          kind: "opening_balance",
          amount: 5,
          occurredAt: organizationWideDto.createdAt,
        },
        {
          kind: "pos_payment",
          id: movementId,
          amount: 90,
          occurredAt: "2026-08-31T12:00:00.000Z",
          storeId,
          paymentId,
          saleId,
          saleNumber: "12",
          paymentMethod: "cash",
        },
        {
          kind: "sale_replacement_reversal",
          id: "88888888-8888-4888-8888-888888888888",
          amount: -90,
          occurredAt: "2026-08-31T12:05:00.000Z",
          storeId,
          reversedMovementId: movementId,
          originalPaymentId: paymentId,
          saleId,
          saleNumber: "12",
          paymentMethod: "cash",
        },
        {
          kind: "pos_payment",
          id: "77777777-7777-4777-8777-777777777777",
          amount: 45,
          occurredAt: "2026-08-31T12:05:00.000Z",
          storeId,
          paymentId: "66666666-6666-4666-8666-666666666666",
          saleId: "55555555-5555-4555-8555-555555555555",
          saleNumber: "13",
          paymentMethod: "cash",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance).toBe(50);
      expect(result.data.entries[2]?.kind).toBe("sale_replacement_reversal");
      if (result.data.entries[2]?.kind === "sale_replacement_reversal") {
        expect(result.data.entries[2].amount).toBe(-90);
        expect(result.data.entries[2].reversedMovementId).toBe(movementId);
        expect(result.data.entries[2].originalPaymentId).toBe(paymentId);
        expect(result.data.entries[2].saleNumber).toBe("12");
      }
    }
  });

  test("account history includes a Purchase payment as a dedicated negative entry linked to the Purchase", () => {
    const outgoingPaymentId = "12121212-1212-4121-8121-121212121212";
    const result = MoneyAccountHistoryResponseSchema.safeParse({
      moneyAccount: {
        ...organizationWideDto,
        openingBalance: 100,
        balance: 60,
        hasMovements: true,
      },
      openingBalance: 100,
      balance: 60,
      entries: [
        {
          kind: "opening_balance",
          amount: 100,
          occurredAt: organizationWideDto.createdAt,
        },
        {
          kind: "outgoing_purchase_payment",
          id: movementId,
          amount: -40,
          occurredAt: "2026-08-31T12:00:00.000Z",
          storeId,
          outgoingPaymentId,
          purchaseId: "88888888-8888-4888-8888-888888888888",
          vendorName: "Fresh Farms",
          paymentMethod: "cash",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance).toBe(60);
      expect(result.data.entries[1]?.kind).toBe("outgoing_purchase_payment");
      if (result.data.entries[1]?.kind === "outgoing_purchase_payment") {
        expect(result.data.entries[1].amount).toBe(-40);
        expect(result.data.entries[1].outgoingPaymentId).toBe(outgoingPaymentId);
        expect(result.data.entries[1].vendorName).toBe("Fresh Farms");
        expect(result.data.entries[1].paymentMethod).toBe("cash");
      }
    }
  });

  test("account history includes an Expense payment as a dedicated negative entry linked to the Expense", () => {
    const outgoingPaymentId = "12121212-1212-4121-8121-121212121212";
    const result = MoneyAccountHistoryResponseSchema.safeParse({
      moneyAccount: {
        ...organizationWideDto,
        openingBalance: 100,
        balance: 60,
        hasMovements: true,
      },
      openingBalance: 100,
      balance: 60,
      entries: [
        {
          kind: "opening_balance",
          amount: 100,
          occurredAt: organizationWideDto.createdAt,
        },
        {
          kind: "outgoing_expense_payment",
          id: movementId,
          amount: -40,
          occurredAt: "2026-08-31T12:00:00.000Z",
          storeId,
          outgoingPaymentId,
          expenseId: "77777777-7777-4777-8777-777777777777",
          expenseCategoryName: "Rent",
          paymentMethod: "cash",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.balance).toBe(60);
      expect(result.data.entries[1]?.kind).toBe("outgoing_expense_payment");
      if (result.data.entries[1]?.kind === "outgoing_expense_payment") {
        expect(result.data.entries[1].amount).toBe(-40);
        expect(result.data.entries[1].outgoingPaymentId).toBe(outgoingPaymentId);
        expect(result.data.entries[1].expenseCategoryName).toBe("Rent");
        expect(result.data.entries[1].paymentMethod).toBe("cash");
      }
    }
  });

  test("account history includes a Purchase payment reversal as a dedicated positive entry linked to the original Movement", () => {
    const outgoingPaymentId = "12121212-1212-4121-8121-121212121212";
    const result = MoneyAccountHistoryResponseSchema.safeParse({
      moneyAccount: {
        ...organizationWideDto,
        openingBalance: 100,
        balance: 100,
        hasMovements: true,
      },
      openingBalance: 100,
      balance: 100,
      entries: [
        {
          kind: "opening_balance",
          amount: 100,
          occurredAt: organizationWideDto.createdAt,
        },
        {
          kind: "outgoing_purchase_payment",
          id: movementId,
          amount: -40,
          occurredAt: "2026-08-31T12:00:00.000Z",
          storeId,
          outgoingPaymentId,
          purchaseId: "88888888-8888-4888-8888-888888888888",
          vendorName: "Fresh Farms",
          paymentMethod: "cash",
        },
        {
          kind: "outgoing_purchase_payment_reversal",
          id: "15151515-1515-4151-8151-151515151515",
          amount: 40,
          occurredAt: "2026-08-31T13:00:00.000Z",
          storeId,
          reversedMovementId: movementId,
          originalOutgoingPaymentId: outgoingPaymentId,
          purchaseId: "88888888-8888-4888-8888-888888888888",
          vendorName: "Fresh Farms",
          paymentMethod: "cash",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries[2]?.kind).toBe("outgoing_purchase_payment_reversal");
      if (result.data.entries[2]?.kind === "outgoing_purchase_payment_reversal") {
        expect(result.data.entries[2].amount).toBe(40);
        expect(result.data.entries[2].reversedMovementId).toBe(movementId);
        expect(result.data.entries[2].originalOutgoingPaymentId).toBe(outgoingPaymentId);
      }
    }
  });

  test("account history includes a Purchase void reversal as a dedicated positive entry distinct from an individual reversal", () => {
    const outgoingPaymentId = "12121212-1212-4121-8121-121212121212";
    const result = MoneyAccountHistoryResponseSchema.safeParse({
      moneyAccount: {
        ...organizationWideDto,
        openingBalance: 100,
        balance: 100,
        hasMovements: true,
      },
      openingBalance: 100,
      balance: 100,
      entries: [
        {
          kind: "opening_balance",
          amount: 100,
          occurredAt: organizationWideDto.createdAt,
        },
        {
          kind: "outgoing_purchase_void_reversal",
          id: "15151515-1515-4151-8151-151515151515",
          amount: 40,
          occurredAt: "2026-08-31T13:00:00.000Z",
          storeId,
          reversedMovementId: movementId,
          originalOutgoingPaymentId: outgoingPaymentId,
          purchaseId: "88888888-8888-4888-8888-888888888888",
          vendorName: "Fresh Farms",
          paymentMethod: "cash",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries[1]?.kind).toBe("outgoing_purchase_void_reversal");
      if (result.data.entries[1]?.kind === "outgoing_purchase_void_reversal") {
        expect(result.data.entries[1].amount).toBe(40);
        expect(result.data.entries[1].vendorName).toBe("Fresh Farms");
      }
    }
  });

  test("account history includes an Expense payment reversal as a dedicated positive entry linked to the original Movement", () => {
    const outgoingPaymentId = "12121212-1212-4121-8121-121212121212";
    const result = MoneyAccountHistoryResponseSchema.safeParse({
      moneyAccount: {
        ...organizationWideDto,
        openingBalance: 100,
        balance: 100,
        hasMovements: true,
      },
      openingBalance: 100,
      balance: 100,
      entries: [
        {
          kind: "opening_balance",
          amount: 100,
          occurredAt: organizationWideDto.createdAt,
        },
        {
          kind: "outgoing_expense_payment",
          id: movementId,
          amount: -40,
          occurredAt: "2026-08-31T12:00:00.000Z",
          storeId,
          outgoingPaymentId,
          expenseId: "77777777-7777-4777-8777-777777777777",
          expenseCategoryName: "Rent",
          paymentMethod: "cash",
        },
        {
          kind: "outgoing_expense_payment_reversal",
          id: "15151515-1515-4151-8151-151515151515",
          amount: 40,
          occurredAt: "2026-08-31T13:00:00.000Z",
          storeId,
          reversedMovementId: movementId,
          originalOutgoingPaymentId: outgoingPaymentId,
          expenseId: "77777777-7777-4777-8777-777777777777",
          expenseCategoryName: "Rent",
          paymentMethod: "cash",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries[2]?.kind).toBe("outgoing_expense_payment_reversal");
      if (result.data.entries[2]?.kind === "outgoing_expense_payment_reversal") {
        expect(result.data.entries[2].amount).toBe(40);
        expect(result.data.entries[2].reversedMovementId).toBe(movementId);
        expect(result.data.entries[2].originalOutgoingPaymentId).toBe(outgoingPaymentId);
        expect(result.data.entries[2].expenseCategoryName).toBe("Rent");
      }
    }
  });

  test("account history includes an Expense void reversal as a dedicated positive entry distinct from an individual reversal", () => {
    const outgoingPaymentId = "12121212-1212-4121-8121-121212121212";
    const result = MoneyAccountHistoryResponseSchema.safeParse({
      moneyAccount: {
        ...organizationWideDto,
        openingBalance: 100,
        balance: 100,
        hasMovements: true,
      },
      openingBalance: 100,
      balance: 100,
      entries: [
        {
          kind: "opening_balance",
          amount: 100,
          occurredAt: organizationWideDto.createdAt,
        },
        {
          kind: "outgoing_expense_void_reversal",
          id: "15151515-1515-4151-8151-151515151515",
          amount: 40,
          occurredAt: "2026-08-31T13:00:00.000Z",
          storeId,
          reversedMovementId: movementId,
          originalOutgoingPaymentId: outgoingPaymentId,
          expenseId: "77777777-7777-4777-8777-777777777777",
          expenseCategoryName: "Rent",
          paymentMethod: "cash",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entries[1]?.kind).toBe("outgoing_expense_void_reversal");
      if (result.data.entries[1]?.kind === "outgoing_expense_void_reversal") {
        expect(result.data.entries[1].amount).toBe(40);
        expect(result.data.entries[1].expenseCategoryName).toBe("Rent");
      }
    }
  });

  test("rejects a history Movement entry without Sale and Payment information", () => {
    expect(
      MoneyAccountHistoryResponseSchema.safeParse({
        moneyAccount: organizationWideDto,
        openingBalance: 0,
        balance: 0,
        entries: [
          {
            kind: "pos_payment",
            id: movementId,
            amount: 10,
            occurredAt: "2026-08-31T12:00:00.000Z",
            storeId,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
