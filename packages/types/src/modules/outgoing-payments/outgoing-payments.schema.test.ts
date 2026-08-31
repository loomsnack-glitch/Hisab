import { describe, expect, test } from "bun:test";
import {
  CreateOutgoingPaymentSchema,
  OUTGOING_PAYMENT_METHODS,
  OutgoingPaymentDTOSchema,
  TRACKED_OUTGOING_PAYMENT_METHODS,
  UNTRACKED_OUTGOING_PAYMENT_METHODS,
  isMoneyAccountAvailableToStore,
  isMoneyAccountEligibleForOutgoingMethod,
  isOutgoingPaymentFundingValid,
  isOutgoingPaymentMethodAllowed,
  sumActiveOutgoingPayments,
} from "./outgoing-payments.schema";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const purchaseId = "88888888-8888-4888-8888-888888888888";
const paymentId = "12121212-1212-4121-8121-121212121212";
const moneyAccountId = "11111111-1111-4111-8111-111111111111";
const storeId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const otherStoreId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const validCreate = {
  amount: 40,
  paymentMethod: "cash" as const,
  reference: "UTR-9",
  notes: "Partial settlement",
};

const cashAccount = {
  id: moneyAccountId,
  status: "active",
  scope: "store_scoped" as const,
  storeId,
  type: "cash" as const,
};

describe("Outgoing Payment contracts", () => {
  test("create Outgoing Payment accepts a positive amount, method, optional reference, and notes", () => {
    const result = CreateOutgoingPaymentSchema.safeParse(validCreate);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(40);
      expect(result.data.paymentMethod).toBe("cash");
      expect(result.data.reference).toBe("UTR-9");
      expect(result.data.notes).toBe("Partial settlement");
    }
  });

  test("create Outgoing Payment trims reference and notes and allows omitting them", () => {
    const trimmed = CreateOutgoingPaymentSchema.safeParse({
      amount: 10,
      paymentMethod: "upi",
      reference: "  UTR-9  ",
      notes: "  Partial settlement  ",
    });
    const omitted = CreateOutgoingPaymentSchema.safeParse({
      amount: 10,
      paymentMethod: "card",
    });

    expect(trimmed.success).toBe(true);
    expect(omitted.success).toBe(true);
    if (trimmed.success) {
      expect(trimmed.data.reference).toBe("UTR-9");
      expect(trimmed.data.notes).toBe("Partial settlement");
    }
  });

  test("rejects zero, negative, or over-precise payment amounts", () => {
    expect(
      CreateOutgoingPaymentSchema.safeParse({ amount: 0, paymentMethod: "cash" }).success,
    ).toBe(false);
    expect(
      CreateOutgoingPaymentSchema.safeParse({ amount: -10, paymentMethod: "cash" }).success,
    ).toBe(false);
    expect(
      CreateOutgoingPaymentSchema.safeParse({ amount: 10.555, paymentMethod: "cash" }).success,
    ).toBe(false);
  });

  test("rejects an invalid Money Account id and unknown payment method", () => {
    expect(
      CreateOutgoingPaymentSchema.safeParse({
        amount: 10,
        paymentMethod: "cash",
        moneyAccountId: "not-a-uuid",
      }).success,
    ).toBe(false);
    expect(
      CreateOutgoingPaymentSchema.safeParse({
        amount: 10,
        paymentMethod: "cheque",
      }).success,
    ).toBe(false);
  });

  test("rejects payable status, paid total, and snapshot fields on create", () => {
    expect(
      CreateOutgoingPaymentSchema.safeParse({
        ...validCreate,
        payableStatus: "paid",
      }).success,
    ).toBe(false);
    expect(
      CreateOutgoingPaymentSchema.safeParse({
        ...validCreate,
        paidTotal: 10,
      }).success,
    ).toBe(false);
    expect(
      CreateOutgoingPaymentSchema.safeParse({
        ...validCreate,
        reversedAt: null,
      }).success,
    ).toBe(false);
  });

  test("untracked methods are Cash, UPI, and Card; tracking adds Bank Transfer and Other", () => {
    expect(UNTRACKED_OUTGOING_PAYMENT_METHODS).toEqual(["cash", "upi", "card"]);
    expect([...TRACKED_OUTGOING_PAYMENT_METHODS]).toEqual([
      "cash",
      "upi",
      "card",
      "bank_transfer",
      "other",
    ]);
    expect([...OUTGOING_PAYMENT_METHODS]).toEqual([...TRACKED_OUTGOING_PAYMENT_METHODS]);
    expect(isOutgoingPaymentMethodAllowed("cash", false)).toBe(true);
    expect(isOutgoingPaymentMethodAllowed("bank_transfer", false)).toBe(false);
    expect(isOutgoingPaymentMethodAllowed("other", false)).toBe(false);
    expect(isOutgoingPaymentMethodAllowed("bank_transfer", true)).toBe(true);
    expect(isOutgoingPaymentMethodAllowed("other", true)).toBe(true);
  });

  test("Outgoing Payment DTO includes method, optional funding account, and a null reversal relationship", () => {
    const result = OutgoingPaymentDTOSchema.safeParse({
      id: paymentId,
      organizationId,
      purchaseId,
      amount: 40,
      paymentMethod: "upi",
      moneyAccountId,
      moneyAccountName: "Shared UPI QR",
      reference: "UTR-9",
      notes: "Partial settlement",
      paidAt: "2026-08-31T12:00:00.000Z",
      reversedAt: null,
      createdBy: userId,
      createdAt: "2026-08-31T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentMethod).toBe("upi");
      expect(result.data.moneyAccountId).toBe(moneyAccountId);
      expect(result.data.reversedAt).toBeNull();
    }
  });
});

describe("Outgoing Payment funding eligibility", () => {
  test("without tracking, a payment must not select a Money Account", () => {
    expect(
      isOutgoingPaymentFundingValid({
        trackingActive: false,
        paymentMethod: "cash",
        moneyAccountId: null,
        moneyAccount: null,
        storeId,
      }),
    ).toBe(true);
    expect(
      isOutgoingPaymentFundingValid({
        trackingActive: false,
        paymentMethod: "cash",
        moneyAccountId,
        moneyAccount: cashAccount,
        storeId,
      }),
    ).toBe(false);
  });

  test("with tracking, Cash, UPI, Card, Bank Transfer, and Other require an eligible active account for the Store", () => {
    expect(
      isOutgoingPaymentFundingValid({
        trackingActive: true,
        paymentMethod: "cash",
        moneyAccountId,
        moneyAccount: cashAccount,
        storeId,
      }),
    ).toBe(true);
    expect(
      isOutgoingPaymentFundingValid({
        trackingActive: true,
        paymentMethod: "cash",
        storeId,
      }),
    ).toBe(false);
  });

  test("an inactive, other-Store, or ineligible-type Money Account cannot fund a tracked payment", () => {
    expect(
      isMoneyAccountAvailableToStore({ ...cashAccount, status: "inactive" }, storeId),
    ).toBe(false);
    expect(isMoneyAccountAvailableToStore({ ...cashAccount, storeId: otherStoreId }, storeId)).toBe(
      false,
    );
    expect(isMoneyAccountEligibleForOutgoingMethod({ type: "bank" }, "cash")).toBe(false);
    expect(isMoneyAccountEligibleForOutgoingMethod({ type: "cash" }, "cash")).toBe(true);
    expect(isMoneyAccountEligibleForOutgoingMethod({ type: "petty_cash" }, "cash")).toBe(true);
    expect(isMoneyAccountEligibleForOutgoingMethod({ type: "bank" }, "bank_transfer")).toBe(true);
    expect(isMoneyAccountEligibleForOutgoingMethod({ type: "upi" }, "upi")).toBe(true);
    expect(isMoneyAccountEligibleForOutgoingMethod({ type: "card_settlement" }, "card")).toBe(true);
    expect(isMoneyAccountEligibleForOutgoingMethod({ type: "other" }, "other")).toBe(true);
    expect(
      isOutgoingPaymentFundingValid({
        trackingActive: true,
        paymentMethod: "upi",
        moneyAccountId,
        moneyAccount: cashAccount,
        storeId,
      }),
    ).toBe(false);
  });

  test("an Organization-wide Money Account is available to every Store", () => {
    expect(
      isMoneyAccountAvailableToStore(
        { status: "active", scope: "organization_wide", storeId: null },
        storeId,
      ),
    ).toBe(true);
    expect(
      isMoneyAccountAvailableToStore(
        { status: "active", scope: "organization_wide", storeId: null },
        otherStoreId,
      ),
    ).toBe(true);
  });

  test("active Outgoing Payments sum excludes reversed payments", () => {
    expect(
      sumActiveOutgoingPayments([
        { amount: 40, reversedAt: null },
        { amount: 20, reversedAt: "2026-08-31T13:00:00.000Z" },
        { amount: 10, reversedAt: null },
      ]),
    ).toBe(50);
  });
});
