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
  readonly quota: "messages" | "budget" | "recipient_window" | "customer_cooldown" | "account_send_interval";

  constructor(quota: CloudQuotaExceededError["quota"]) {
    super(
      quota === "messages"
        ? "WhatsApp Cloud monthly message quota reached"
        : quota === "budget"
          ? "WhatsApp Cloud monthly budget reached"
          : quota === "recipient_window"
            ? "WhatsApp Cloud recipient window limit reached"
            : quota === "customer_cooldown"
              ? "WhatsApp customer cooldown is active"
              : "WhatsApp Cloud account send interval is active",
    );
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

export type CloudQuotaPolicy = {
  monthlyMessageLimit: number | null;
  monthlyBudgetMinor: number | null;
  currencyCode: string;
  accountSendIntervalSeconds: number;
  recipientWindowSeconds: number;
  recipientWindowLimit: number | null;
  customerCooldownSeconds: number;
};

const defaultCloudQuotaPolicy: CloudQuotaPolicy = {
  monthlyMessageLimit: null,
  monthlyBudgetMinor: null,
  currencyCode: "INR",
  accountSendIntervalSeconds: 0,
  recipientWindowSeconds: 86_400,
  recipientWindowLimit: null,
  customerCooldownSeconds: 0,
};

const mapPolicy = (row: Record<string, unknown> | undefined): CloudQuotaPolicy => row ? {
  monthlyMessageLimit: row.monthly_message_limit == null ? null : Number(row.monthly_message_limit),
  monthlyBudgetMinor: row.monthly_budget_minor == null ? null : Number(row.monthly_budget_minor),
  currencyCode: String(row.currency_code),
  accountSendIntervalSeconds: Number(row.account_send_interval_seconds),
  recipientWindowSeconds: Number(row.recipient_window_seconds),
  recipientWindowLimit: row.recipient_window_limit == null ? null : Number(row.recipient_window_limit),
  customerCooldownSeconds: Number(row.customer_cooldown_seconds),
} : { ...defaultCloudQuotaPolicy };

export const getCloudQuotaPolicy = async (organizationId: string): Promise<CloudQuotaPolicy> => {
  const [row] = await pg`
    SELECT monthly_message_limit, monthly_budget_minor, currency_code,
           account_send_interval_seconds, recipient_window_seconds,
           recipient_window_limit, customer_cooldown_seconds
    FROM whatsapp_cloud_quota_policies
    WHERE organization_id = ${organizationId}
  `;
  return mapPolicy(row as Record<string, unknown> | undefined);
};

export const updateCloudQuotaPolicy = async (
  organizationId: string,
  policy: CloudQuotaPolicy,
): Promise<CloudQuotaPolicy> => {
  if (!/^[A-Z]{3}$/.test(policy.currencyCode)) throw new Error("Cloud quota currency must be an ISO 4217 code");
  const [row] = await pg`
    INSERT INTO whatsapp_cloud_quota_policies (
      organization_id, monthly_message_limit, monthly_budget_minor, currency_code,
      account_send_interval_seconds, recipient_window_seconds,
      recipient_window_limit, customer_cooldown_seconds
    ) VALUES (
      ${organizationId}, ${policy.monthlyMessageLimit}, ${policy.monthlyBudgetMinor}, ${policy.currencyCode},
      ${policy.accountSendIntervalSeconds}, ${policy.recipientWindowSeconds},
      ${policy.recipientWindowLimit}, ${policy.customerCooldownSeconds}
    )
    ON CONFLICT (organization_id) DO UPDATE SET
      monthly_message_limit = EXCLUDED.monthly_message_limit,
      monthly_budget_minor = EXCLUDED.monthly_budget_minor,
      currency_code = EXCLUDED.currency_code,
      account_send_interval_seconds = EXCLUDED.account_send_interval_seconds,
      recipient_window_seconds = EXCLUDED.recipient_window_seconds,
      recipient_window_limit = EXCLUDED.recipient_window_limit,
      customer_cooldown_seconds = EXCLUDED.customer_cooldown_seconds,
      updated_at = NOW()
    RETURNING monthly_message_limit, monthly_budget_minor, currency_code,
              account_send_interval_seconds, recipient_window_seconds,
              recipient_window_limit, customer_cooldown_seconds
  `;
  if (!row) throw new Error("Cloud quota policy could not be saved");
  return mapPolicy(row as Record<string, unknown>);
};

export class CloudDuplicateCampaignRecipientError extends Error {
  constructor() {
    super("This customer is already included in the Cloud campaign");
    this.name = "CloudDuplicateCampaignRecipientError";
  }
}

const campaignKeyFor = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 255 || /[\r\n]/.test(normalized)) {
    throw new Error("Cloud campaign key is invalid");
  }
  return normalized;
};

export const reserveCloudQuota = async (
  tx: Bun.TransactionSQL,
  input: {
    organizationId: string;
    accountId: string;
    storeId: string;
    customerId: string;
    idempotencyKey: string;
    campaignKey?: string | null;
  },
): Promise<CloudQuotaReservation> => {
  const costMinor = estimatedCostMinor();
  const campaignKey = campaignKeyFor(input.campaignKey);
  await tx`
    INSERT INTO whatsapp_cloud_quota_policies (organization_id)
    VALUES (${input.organizationId})
    ON CONFLICT (organization_id) DO NOTHING
  `;
  const [policy] = await tx`
    SELECT monthly_message_limit, monthly_budget_minor,
           account_send_interval_seconds, recipient_window_seconds,
           recipient_window_limit, customer_cooldown_seconds
    FROM whatsapp_cloud_quota_policies
    WHERE organization_id = ${input.organizationId}
    FOR UPDATE
  `;
  if (!policy) throw new Error("WhatsApp Cloud quota policy could not be loaded");

  if (campaignKey) {
    const [duplicate] = await tx`
      SELECT id
      FROM whatsapp_cloud_quota_reservations
      WHERE organization_id = ${input.organizationId}
        AND campaign_key = ${campaignKey}
        AND customer_id = ${input.customerId}
      FOR UPDATE
    `;
    if (duplicate) throw new CloudDuplicateCampaignRecipientError();
  }

  const [recentAccountSend] = await tx`
    SELECT id
    FROM whatsapp_cloud_quota_reservations
    WHERE organization_id = ${input.organizationId}
      AND whatsapp_account_id = ${input.accountId}
      AND status <> 'released'
      AND created_at >= NOW() - make_interval(secs => ${Number(policy.account_send_interval_seconds ?? 0)})
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (recentAccountSend && Number(policy.account_send_interval_seconds ?? 0) > 0) {
    throw new CloudQuotaExceededError("account_send_interval");
  }

  const [recentCustomerSend] = await tx`
    SELECT id
    FROM whatsapp_cloud_quota_reservations
    WHERE organization_id = ${input.organizationId}
      AND customer_id = ${input.customerId}
      AND status <> 'released'
      AND created_at >= NOW() - make_interval(secs => ${Number(policy.customer_cooldown_seconds ?? 0)})
    ORDER BY created_at DESC
    LIMIT 1
  `;
  if (recentCustomerSend && Number(policy.customer_cooldown_seconds ?? 0) > 0) {
    throw new CloudQuotaExceededError("customer_cooldown");
  }

  if (policy.recipient_window_limit != null) {
    const [window] = await tx`
      SELECT COUNT(*) AS count
      FROM whatsapp_cloud_quota_reservations
      WHERE organization_id = ${input.organizationId}
        AND whatsapp_account_id = ${input.accountId}
        AND status <> 'released'
        AND created_at >= NOW() - make_interval(secs => ${Number(policy.recipient_window_seconds)})
    `;
    if (Number(window?.count ?? 0) >= Number(policy.recipient_window_limit)) {
      throw new CloudQuotaExceededError("recipient_window");
    }
  }

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
      idempotency_key, campaign_key, period_start, units, estimated_cost_minor, status
    ) VALUES (
      ${input.organizationId}, ${input.accountId}, ${input.storeId}, ${input.customerId},
      ${input.idempotencyKey}, ${campaignKey}, date_trunc('month', NOW()), ${requestedUnits}, ${requestedCostMinor}, 'reserved'
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

export const cancelCloudCampaign = async (
  organizationId: string,
  campaignKey: string,
): Promise<number> => pg.begin(async tx => {
  const normalizedCampaignKey = campaignKeyFor(campaignKey);
  if (!normalizedCampaignKey) throw new Error("Cloud campaign key is invalid");
  const rows = await tx`
    SELECT outbox.id AS outbox_id, outbox.message_id, reservation.id AS reservation_id
    FROM whatsapp_outbox outbox
    INNER JOIN whatsapp_cloud_quota_reservations reservation
      ON reservation.id = outbox.cloud_quota_reservation_id
     AND reservation.organization_id = outbox.organization_id
    WHERE outbox.organization_id = ${organizationId}
      AND reservation.campaign_key = ${normalizedCampaignKey}
      AND outbox.status IN ('pending', 'retryable')
    FOR UPDATE OF outbox, reservation
  `;
  for (const row of rows) {
    await tx`
      UPDATE whatsapp_outbox
      SET status = 'cancelled',
          next_attempt_at = NOW(),
          lease_owner = NULL,
          lease_expires_at = NULL,
          last_error_code = 'campaign_cancelled',
          last_error_message = 'Cloud campaign was stopped before dispatch',
          updated_at = NOW()
      WHERE id = ${row.outbox_id}
    `;
    await tx`
      UPDATE whatsapp_messages
      SET status = 'failed',
          failure_code = 'campaign_cancelled',
          failure_message = 'Cloud campaign was stopped before dispatch'
      WHERE id = ${row.message_id}
    `;
    await tx`
      UPDATE whatsapp_campaign_recipients
      SET status = 'cancelled', failure_code = 'campaign_cancelled', failure_message = 'Cloud campaign was stopped before dispatch', updated_at = NOW()
      WHERE outbox_id = ${row.outbox_id}
    `;
    await releaseCloudQuota(tx, String(row.reservation_id));
  }
  await tx`
    UPDATE whatsapp_campaigns
    SET status = 'cancelled', updated_at = NOW()
    WHERE organization_id = ${organizationId}
      AND id::text = ${normalizedCampaignKey}
  `;
  return rows.length;
});

export const getCloudQuotaReconciliation = async (organizationId: string): Promise<{
  reservationCount: number;
  ledgerEventCount: number;
  missingReservedEvents: number;
  missingSettlementEvents: number;
  missingReleaseEvents: number;
}> => {
  const [row] = await pg`
    SELECT
      COUNT(reservation.id) AS reservation_count,
      COUNT(ledger.id) AS ledger_event_count,
      COUNT(*) FILTER (
        WHERE reservation.status IN ('reserved', 'settled', 'released')
          AND reserved_event.id IS NULL
      ) AS missing_reserved_events,
      COUNT(*) FILTER (
        WHERE reservation.status = 'settled' AND settled_event.id IS NULL
      ) AS missing_settlement_events,
      COUNT(*) FILTER (
        WHERE reservation.status = 'released' AND released_event.id IS NULL
      ) AS missing_release_events
    FROM whatsapp_cloud_quota_reservations reservation
    LEFT JOIN whatsapp_cloud_usage_ledger ledger
      ON ledger.reservation_id = reservation.id
    LEFT JOIN whatsapp_cloud_usage_ledger reserved_event
      ON reserved_event.reservation_id = reservation.id
     AND reserved_event.event_type = 'reserved'
    LEFT JOIN whatsapp_cloud_usage_ledger settled_event
      ON settled_event.reservation_id = reservation.id
     AND settled_event.event_type = 'settled'
    LEFT JOIN whatsapp_cloud_usage_ledger released_event
      ON released_event.reservation_id = reservation.id
     AND released_event.event_type = 'released'
    WHERE reservation.organization_id = ${organizationId}
  `;
  return {
    reservationCount: Number(row?.reservation_count ?? 0),
    ledgerEventCount: Number(row?.ledger_event_count ?? 0),
    missingReservedEvents: Number(row?.missing_reserved_events ?? 0),
    missingSettlementEvents: Number(row?.missing_settlement_events ?? 0),
    missingReleaseEvents: Number(row?.missing_release_events ?? 0),
  };
};
