import { describe, expect, test } from "bun:test";
import { PaymentMethodSchema } from "../billing/billing.schema";
import {
  CreateMoneyAccountSchema,
  MONEY_ACCOUNT_NAME_MAX_LENGTH,
  MONEY_ACCOUNT_NOTES_MAX_LENGTH,
  MONEY_ACCOUNT_SCOPE_LABELS,
  MoneyAccountDTOSchema,
  ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPE_LABELS,
  ORGANIZATION_WIDE_MONEY_ACCOUNT_TYPES,
  UpdateMoneyAccountSchema,
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

  test("rejects Cash as an Organization-wide Money Account type", () => {
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "Store cash",
        type: "cash",
      }).success,
    ).toBe(false);
    expect(
      UpdateMoneyAccountSchema.safeParse({
        type: "cash",
      }).success,
    ).toBe(false);
  });

  test("rejects Cash even when Store-scoped", () => {
    expect(
      CreateMoneyAccountSchema.safeParse({
        name: "Store cash",
        type: "cash",
        scope: "store_scoped",
        storeId,
      }).success,
    ).toBe(false);
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
      openingBalance: 500,
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
      expect("bankAccountNumber" in result.data).toBe(false);
      expect("upiId" in result.data).toBe(false);
      expect("balance" in result.data).toBe(false);
    }
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

  test("rejects a Cash Money Account DTO", () => {
    expect(
      MoneyAccountDTOSchema.safeParse({
        ...organizationWideDto,
        name: "Store cash",
        type: "cash",
        scope: "store_scoped",
        storeId,
      }).success,
    ).toBe(false);
  });

  test("does not replace Billing Payment Method values", () => {
    expect(PaymentMethodSchema.options).toEqual(["cash", "upi", "card", "bank_transfer", "other"]);
  });
});
