import { pg } from "@/config/db";

export type CloudQuotaCapacity = {
  monthlyMessageLimit: number | null;
  monthlyBudgetMinor: number | null;
  usedUnits: number;
  usedCostMinor: number;
  requestedUnits: number;
  requestedCostMinor: number;
};

export class CloudQuotaExceededError extends Error {
  readonly quota: "messages" | "budget";

  constructor(quota: "messages" | "budget") {
    super(quota === "messages" ? "WhatsApp Cloud monthly message quota reached" : "WhatsApp Cloud monthly budget reached");
    this.name = "CloudQuotaExceededError";
    this.quota = quota;
  }
}

export const assertCloudQuotaCapacity = (input: CloudQuotaCapacity): void => {
  if (input.monthlyMessageLimit !== null && input.usedUnits + input.requestedUnits > input.monthlyMessageLimit) {
    throw new CloudQuotaExceededError("messages");
  }
  if (input.monthlyBudgetMinor !== null && input.usedCostMinor + input.requestedCostMinor > input.monthlyBudgetMinor) {
    throw new CloudQuotaExceededError("budget");
  }
};

const estimatedCostMinor = (): number => {
  const configured = Number(process.env.WHATSAPP_CLOUD_ESTIMATED_COST_MINOR ?? 0);
  return Number.isInteger(configured) && configured >= 0 ? configured : 0;
};

export type CloudQuotaReservation = {
  id: string;
  units: number;
  estimatedCostMinor: number;
  status: "reserved" | "settled" | "released";
};

export const reserveCloudQuota = async (
  tx: Bun.TransactionSQL,
  input: {
    organizationId: string;
    accountId: string;
    storeId: string;
    customerId: string;
    idempotencyKey: string;
  },
): Promise<CloudQuotaReservation> => {
  const costMinor = estimatedCostMinor();
  await tx`
    INSERT INTO whatsapp_cloud_quota_policies (organization_id)
    VALUES (${input.organizationId})
    ON CONFLICT (organization_id) DO NOTHING
  `;
  const [policy] = await tx`
    SELECT monthly_message_limit, monthly_budget_minor
    FROM whatsapp_cloud_quota_policies
    WHERE organization_id = ${input.organizationId}
    FOR UPDATE
  `;
  if (!policy) throw new Error("WhatsApp Cloud quota policy could not be loaded");

  const [usage] = await tx`
    SELECT COALESCE(SUM(units_delta), 0) AS used_units,
           COALESCE(SUM(cost_minor_delta), 0) AS used_cost_minor
    FROM whatsapp_cloud_usage_ledger
    WHERE organization_id = ${input.organizationId}
      AND period_start = date_trunc('month', NOW())
  `;
  const requestedUnits = 1;
  const requestedCostMinor = costMinor;
  assertCloudQuotaCapacity({
    monthlyMessageLimit: policy.monthly_message_limit == null ? null : Number(policy.monthly_message_limit),
    monthlyBudgetMinor: policy.monthly_budget_minor == null ? null : Number(policy.monthly_budget_minor),
    usedUnits: Number(usage?.used_units ?? 0),
    usedCostMinor: Number(usage?.used_cost_minor ?? 0),
    requestedUnits,
    requestedCostMinor,
  });

  const [reservation] = await tx`
    INSERT INTO whatsapp_cloud_quota_reservations (
      organization_id, whatsapp_account_id, store_id, customer_id,
      idempotency_key, period_start, units, estimated_cost_minor, status
    ) VALUES (
      ${input.organizationId}, ${input.accountId}, ${input.storeId}, ${input.customerId},
      ${input.idempotencyKey}, date_trunc('month', NOW()), ${requestedUnits}, ${requestedCostMinor}, 'reserved'
    )
    ON CONFLICT (organization_id, idempotency_key) DO NOTHING
    RETURNING id, units, estimated_cost_minor, status
  `;
  if (reservation) {
    await tx`
      INSERT INTO whatsapp_cloud_usage_ledger (
        organization_id, reservation_id, event_type, period_start, units_delta, cost_minor_delta
      ) VALUES (
        ${input.organizationId}, ${reservation.id}, 'reserved', date_trunc('month', NOW()), ${requestedUnits}, ${requestedCostMinor}
      )
      ON CONFLICT (reservation_id, event_type) DO NOTHING
    `;
    return {
      id: String(reservation.id),
      units: Number(reservation.units),
      estimatedCostMinor: Number(reservation.estimated_cost_minor),
      status: reservation.status as CloudQuotaReservation["status"],
    };
  }

  const [existing] = await tx`
    SELECT id, units, estimated_cost_minor, status
    FROM whatsapp_cloud_quota_reservations
    WHERE organization_id = ${input.organizationId}
      AND idempotency_key = ${input.idempotencyKey}
      AND whatsapp_account_id = ${input.accountId}
      AND store_id = ${input.storeId}
      AND customer_id = ${input.customerId}
    FOR UPDATE
  `;
  if (!existing) throw new Error("Cloud quota idempotency key is already used for another send");
  return {
    id: String(existing.id),
    units: Number(existing.units),
    estimatedCostMinor: Number(existing.estimated_cost_minor),
    status: existing.status as CloudQuotaReservation["status"],
  };
};

export const settleCloudQuota = async (tx: Bun.TransactionSQL, reservationId: string): Promise<void> => {
  const [reservation] = await tx`
    UPDATE whatsapp_cloud_quota_reservations
    SET status = 'settled', settled_at = COALESCE(settled_at, NOW())
    WHERE id = ${reservationId} AND status = 'reserved'
    RETURNING organization_id, period_start
  `;
  if (!reservation) return;
  await tx`
    INSERT INTO whatsapp_cloud_usage_ledger (
      organization_id, reservation_id, event_type, period_start, units_delta, cost_minor_delta
    ) VALUES (${reservation.organization_id}, ${reservationId}, 'settled', ${reservation.period_start}, 0, 0)
    ON CONFLICT (reservation_id, event_type) DO NOTHING
  `;
};

export const releaseCloudQuota = async (tx: Bun.TransactionSQL, reservationId: string): Promise<void> => {
  const [reservation] = await tx`
    UPDATE whatsapp_cloud_quota_reservations
    SET status = 'released', released_at = COALESCE(released_at, NOW())
    WHERE id = ${reservationId} AND status = 'reserved'
    RETURNING organization_id, period_start, units, estimated_cost_minor
  `;
  if (!reservation) return;
  await tx`
    INSERT INTO whatsapp_cloud_usage_ledger (
      organization_id, reservation_id, event_type, period_start, units_delta, cost_minor_delta
    ) VALUES (
      ${reservation.organization_id}, ${reservationId}, 'released', ${reservation.period_start},
      ${-Number(reservation.units)}, ${-Number(reservation.estimated_cost_minor)}
    )
    ON CONFLICT (reservation_id, event_type) DO NOTHING
  `;
};

export const getCloudQuotaLedgerSummary = async (organizationId: string): Promise<{
  units: number;
  costMinor: number;
}> => {
  const [row] = await pg`
    SELECT COALESCE(SUM(units_delta), 0) AS units,
           COALESCE(SUM(cost_minor_delta), 0) AS cost_minor
    FROM whatsapp_cloud_usage_ledger
    WHERE organization_id = ${organizationId}
      AND period_start = date_trunc('month', NOW())
  `;
  return { units: Number(row?.units ?? 0), costMinor: Number(row?.cost_minor ?? 0) };
};
