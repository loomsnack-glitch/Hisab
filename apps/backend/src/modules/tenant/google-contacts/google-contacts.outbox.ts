import { randomUUID } from "node:crypto";
import { normalizePhoneNumber, type GoogleContactsSyncStatus } from "@repo/types";
import { pg } from "@/config/db";
import type { GoogleContactsCredentialBinding } from "./google-contacts.credentials";
import {
  decideGoogleContactsCustomerSchedule,
  decideGoogleContactsOutboxCompletion,
  googleContactsCustomerIsEligible,
  type GoogleContactsOutboxStatus,
} from "./google-contacts.customer-sync";
import { getGoogleContactsConnectionStatus } from "./google-contacts.repository";
import type { GoogleContactsSyncJob, GoogleContactsSyncOutcome } from "./google-contacts.worker";

export type GoogleContactsOutboxClaim = {
  job: GoogleContactsSyncJob;
  credential: GoogleContactsCredentialBinding;
  leaseOwner: string;
  attemptCount: number;
};

const MAX_ATTEMPTS = 8;
const MIN_LEASE_SECONDS = 30;
const MAX_LEASE_SECONDS = 300;

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  updated_at: Date | string;
};

type GoogleContactsDatabase = typeof pg | Bun.TransactionSQL;

const asTime = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();
  const time = new Date(String(value ?? "")).getTime();
  return Number.isFinite(time) ? time : 0;
};

const asIso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value ?? ""));
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date(0).toISOString();
};

const eligibleCustomers = (
  rows: CustomerRow[],
): Array<{ id: string; name: string; phone: string; updatedAt: Date | string }> => {
  const eligible: Array<{ id: string; name: string; phone: string; updatedAt: Date | string }> = [];
  for (const row of rows) {
    const phone = normalizePhoneNumber(row.phone);
    if (!phone) continue;
    eligible.push({
      id: row.id,
      name: String(row.name),
      phone,
      updatedAt: row.updated_at,
    });
  }
  return eligible;
};

export const scheduleGoogleContactsInitialCatchUp = async (
  organizationId: string,
): Promise<GoogleContactsSyncStatus> => {
  await pg.begin(async (tx) => {
    const [connection] = await tx`
      SELECT id, status, initial_sync_status
      FROM google_contacts_connections
      WHERE organization_id = ${organizationId}
      FOR UPDATE
    `;
    if (!connection || String(connection.status) !== "connected") {
      return;
    }

    const customers = await tx`
      SELECT id, name, phone, updated_at
      FROM customers
      WHERE organization_id = ${organizationId}
    ` as CustomerRow[];
    const scheduled = eligibleCustomers(customers);

    for (const customer of scheduled) {
      await tx`
        INSERT INTO google_contacts_sync_outbox (
          organization_id,
          connection_id,
          customer_id,
          status,
          customer_updated_at
        ) VALUES (
          ${organizationId},
          ${connection.id},
          ${customer.id},
          'pending',
          ${customer.updatedAt}
        )
        ON CONFLICT (connection_id, customer_id) DO NOTHING
      `;
    }

    const [pending] = await tx`
      SELECT COUNT(*)::int AS count
      FROM google_contacts_sync_outbox
      WHERE connection_id = ${connection.id}
        AND status IN ('pending', 'processing')
    `;
    const pendingCount = Number(pending?.count ?? 0);
    await tx`
      UPDATE google_contacts_connections
      SET
        initial_sync_status = ${pendingCount > 0 ? "pending" : "completed"},
        updated_at = NOW()
      WHERE id = ${connection.id}
        AND status = 'connected'
        AND initial_sync_status IN ('not_started', 'pending')
    `;
  });

  return getGoogleContactsConnectionStatus(organizationId);
};

export const scheduleGoogleContactsCustomerChange = async (
  input: {
    organizationId: string;
    customerId: string;
    customerUpdatedAt: Date | string;
    phone: string | null | undefined;
  },
  db: GoogleContactsDatabase = pg,
): Promise<void> => {
  const customerUpdatedAt = asTime(input.customerUpdatedAt);
  const eligible = googleContactsCustomerIsEligible(input.phone);
  const [connection] = await db`
    SELECT id, status
    FROM google_contacts_connections
    WHERE organization_id = ${input.organizationId}
    FOR UPDATE
  `;
  if (!connection) return;

  const [existing] = await db`
    SELECT id, status, customer_updated_at
    FROM google_contacts_sync_outbox
    WHERE connection_id = ${connection.id}
      AND customer_id = ${input.customerId}
    FOR UPDATE
  `;
  const decision = decideGoogleContactsCustomerSchedule({
    existing: existing
      ? {
          status: String(existing.status) as GoogleContactsOutboxStatus,
          customerUpdatedAt: asTime(existing.customer_updated_at),
        }
      : null,
    eligible,
    customerUpdatedAt,
    connectionStatus: String(connection.status),
  });

  if (decision.action === "noop") return;
  if (!existing && decision.action !== "insert") return;

  if (decision.action === "insert") {
    await db`
      INSERT INTO google_contacts_sync_outbox (
        organization_id,
        connection_id,
        customer_id,
        status,
        customer_updated_at
      ) VALUES (
        ${input.organizationId},
        ${connection.id},
        ${input.customerId},
        'pending',
        ${new Date(decision.customerUpdatedAt)}
      )
      ON CONFLICT (connection_id, customer_id) DO NOTHING
    `;
    return;
  }

  if (decision.action === "skip") {
    if (!existing) return;
    await db`
      UPDATE google_contacts_sync_outbox
      SET
        status = 'skipped',
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = NULL,
        last_error_message = NULL,
        customer_updated_at = ${new Date(decision.customerUpdatedAt)},
        updated_at = NOW()
      WHERE id = ${existing.id}
        AND status IN ('pending', 'failed', 'conflict')
    `;
    return;
  }

  if (decision.resetForRetry) {
    if (!existing) return;
    await db`
      UPDATE google_contacts_sync_outbox
      SET
        status = 'pending',
        attempt_count = 0,
        next_attempt_at = NOW(),
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = NULL,
        last_error_message = NULL,
        customer_updated_at = ${new Date(decision.customerUpdatedAt)},
        updated_at = NOW()
      WHERE id = ${existing.id}
        AND status <> 'processing'
    `;
    return;
  }

  if (!existing) return;
  await db`
    UPDATE google_contacts_sync_outbox
    SET
      customer_updated_at = ${new Date(decision.customerUpdatedAt)},
      updated_at = NOW()
    WHERE id = ${existing.id}
  `;
};

export const claimNextGoogleContactsOutbox = async (
  leaseSeconds: number,
  workerId = "google-contacts-worker",
): Promise<GoogleContactsOutboxClaim | null> => {
  const leaseOwner = `${workerId}-${randomUUID()}`;
  const safeLeaseSeconds = Math.min(
    Math.max(Math.trunc(leaseSeconds), MIN_LEASE_SECONDS),
    MAX_LEASE_SECONDS,
  );

  return pg.begin(async (tx) => {
    await tx`
      UPDATE google_contacts_sync_outbox
      SET
        status = 'pending',
        lease_owner = NULL,
        lease_expires_at = NULL,
        updated_at = NOW()
      WHERE status = 'processing'
        AND (lease_expires_at IS NULL OR lease_expires_at < NOW())
    `;

    const [candidate] = await tx`
      SELECT outbox.id
      FROM google_contacts_sync_outbox outbox
      INNER JOIN google_contacts_connections connection
        ON connection.id = outbox.connection_id
       AND connection.organization_id = outbox.organization_id
      WHERE outbox.status = 'pending'
        AND outbox.next_attempt_at <= NOW()
        AND connection.status = 'connected'
        AND connection.credential_reference IS NOT NULL
        AND connection.credential_key_version IS NOT NULL
      ORDER BY outbox.next_attempt_at ASC, outbox.created_at ASC, outbox.id ASC
      FOR UPDATE OF outbox SKIP LOCKED
      LIMIT 1
    `;
    if (!candidate) return null;

    const [claimed] = await tx`
      UPDATE google_contacts_sync_outbox
      SET
        status = 'processing',
        attempt_count = attempt_count + 1,
        lease_owner = ${leaseOwner},
        lease_expires_at = NOW() + make_interval(secs => ${safeLeaseSeconds}),
        updated_at = NOW()
      WHERE id = ${candidate.id}
      RETURNING id, organization_id, connection_id, customer_id, attempt_count, lease_owner
    `;
    if (!claimed) return null;

    const [row] = await tx`
      SELECT
        outbox.id AS outbox_id,
        outbox.organization_id,
        outbox.connection_id,
        outbox.customer_id,
        outbox.attempt_count,
        outbox.lease_owner,
        connection.status AS connection_status,
        connection.credential_reference,
        connection.credential_key_version,
        customer.name AS customer_name,
        customer.phone AS customer_phone,
        customer.updated_at AS customer_updated_at,
        link.google_resource_name,
        link.matched_phone
      FROM google_contacts_sync_outbox outbox
      INNER JOIN google_contacts_connections connection
        ON connection.id = outbox.connection_id
      INNER JOIN customers customer
        ON customer.id = outbox.customer_id
       AND customer.organization_id = outbox.organization_id
      LEFT JOIN google_contacts_customer_links link
        ON link.connection_id = outbox.connection_id
       AND link.customer_id = outbox.customer_id
      WHERE outbox.id = ${claimed.id}
    `;
    if (!row) throw new Error("Claimed Google Contacts outbox entry could not be loaded");

    return {
      leaseOwner: String(row.lease_owner),
      attemptCount: Number(row.attempt_count ?? 1),
      credential: {
        reference: String(row.credential_reference),
        keyVersion: String(row.credential_key_version),
      },
      job: {
        outboxId: String(row.outbox_id),
        organizationId: String(row.organization_id),
        connectionId: String(row.connection_id),
        customerId: String(row.customer_id),
        connectionStatus: String(row.connection_status) as GoogleContactsSyncJob["connectionStatus"],
        customerName: String(row.customer_name ?? ""),
        customerPhone: row.customer_phone == null ? null : String(row.customer_phone),
        customerUpdatedAt: asIso(row.customer_updated_at),
        linkedGoogleResourceName:
          row.google_resource_name == null ? null : String(row.google_resource_name),
        matchedPhone: row.matched_phone == null ? null : String(row.matched_phone),
      },
    };
  });
};

const backoffSeconds = (attemptCount: number): number =>
  Math.min(30 * 2 ** Math.max(attemptCount - 1, 0), 900);

export const completeGoogleContactsOutbox = async (input: {
  outboxId: string;
  leaseOwner: string;
  outcome: GoogleContactsSyncOutcome;
  attemptCount: number;
  claimedCustomerUpdatedAt?: Date | string;
}): Promise<boolean> => {
  return pg.begin(async (tx) => {
    const [existing] = await tx`
      SELECT id, organization_id, connection_id, customer_id, status, lease_owner, customer_updated_at
      FROM google_contacts_sync_outbox
      WHERE id = ${input.outboxId}
        AND lease_owner = ${input.leaseOwner}
        AND status = 'processing'
      FOR UPDATE
    `;
    if (!existing) return false;

    const [customer] = await tx`
      SELECT phone, updated_at FROM customers
      WHERE id = ${existing.customer_id}
        AND organization_id = ${existing.organization_id}
    `;
    const claimedCustomerUpdatedAt = asTime(
      input.claimedCustomerUpdatedAt ?? existing.customer_updated_at,
    );
    const completion = decideGoogleContactsOutboxCompletion({
      claimedCustomerUpdatedAt,
      outboxCustomerUpdatedAt: asTime(existing.customer_updated_at),
      currentCustomerUpdatedAt: asTime(customer?.updated_at ?? existing.customer_updated_at),
      currentEligible: googleContactsCustomerIsEligible(
        customer?.phone == null ? null : String(customer.phone),
      ),
    });

    if (completion.action === "requeue") {
      await tx`
        UPDATE google_contacts_sync_outbox
        SET
          status = 'pending',
          attempt_count = 0,
          next_attempt_at = NOW(),
          lease_owner = NULL,
          lease_expires_at = NULL,
          last_error_code = NULL,
          last_error_message = NULL,
          updated_at = NOW()
        WHERE id = ${input.outboxId}
      `;
      return true;
    }

    if (completion.action === "skip") {
      await tx`
        UPDATE google_contacts_sync_outbox
        SET
          status = 'skipped',
          lease_owner = NULL,
          lease_expires_at = NULL,
          last_error_code = NULL,
          last_error_message = NULL,
          updated_at = NOW()
        WHERE id = ${input.outboxId}
      `;
      await tx`
        UPDATE google_contacts_connections connection
        SET
          initial_sync_status = 'completed',
          updated_at = NOW()
        WHERE connection.id = ${existing.connection_id}
          AND connection.initial_sync_status = 'pending'
          AND NOT EXISTS (
            SELECT 1
            FROM google_contacts_sync_outbox outbox
            WHERE outbox.connection_id = connection.id
              AND outbox.status IN ('pending', 'processing')
          )
      `;
      return true;
    }

    if (input.outcome.status === "retryable" && input.attemptCount < MAX_ATTEMPTS) {
      await tx`
        UPDATE google_contacts_sync_outbox
        SET
          status = 'pending',
          lease_owner = NULL,
          lease_expires_at = NULL,
          last_error_code = ${input.outcome.code},
          last_error_message = ${input.outcome.message},
          next_attempt_at = NOW() + make_interval(secs => ${backoffSeconds(input.attemptCount)}),
          updated_at = NOW()
        WHERE id = ${input.outboxId}
      `;
      return true;
    }

    const nextStatus =
      input.outcome.status === "created" || input.outcome.status === "updated"
        ? "completed"
        : input.outcome.status === "skipped"
          ? "skipped"
          : input.outcome.status === "conflict"
            ? "conflict"
            : "failed";
    const errorCode =
      input.outcome.status === "retryable" || input.outcome.status === "failed"
        ? input.outcome.code
        : input.outcome.status === "conflict"
          ? "multiple_matches"
          : null;
    const errorMessage =
      input.outcome.status === "retryable" || input.outcome.status === "failed"
        ? input.outcome.message
        : input.outcome.status === "conflict"
          ? "More than one Google Contact has this phone number"
          : null;

    await tx`
      UPDATE google_contacts_sync_outbox
      SET
        status = ${nextStatus},
        lease_owner = NULL,
        lease_expires_at = NULL,
        last_error_code = ${errorCode},
        last_error_message = ${errorMessage},
        updated_at = NOW()
      WHERE id = ${input.outboxId}
    `;

    if (input.outcome.status === "created" || input.outcome.status === "updated") {
      const [customer] = await tx`
        SELECT phone FROM customers
        WHERE id = ${existing.customer_id}
          AND organization_id = ${existing.organization_id}
      `;
      const matchedPhone = normalizePhoneNumber(customer?.phone == null ? null : String(customer.phone));
      const [resourceOwner] = await tx`
        SELECT customer_id
        FROM google_contacts_customer_links
        WHERE connection_id = ${existing.connection_id}
          AND google_resource_name = ${input.outcome.googleResourceName}
          AND customer_id <> ${existing.customer_id}
      `;
      if (resourceOwner) {
        await tx`
          UPDATE google_contacts_sync_outbox
          SET
            status = 'conflict',
            lease_owner = NULL,
            lease_expires_at = NULL,
            last_error_code = 'phone_collision',
            last_error_message = 'This Google Contact is already linked to another Customer',
            updated_at = NOW()
          WHERE id = ${input.outboxId}
        `;
      } else if (matchedPhone) {
        await tx`
          INSERT INTO google_contacts_customer_links (
            organization_id,
            connection_id,
            customer_id,
            google_resource_name,
            matched_phone
          ) VALUES (
            ${existing.organization_id},
            ${existing.connection_id},
            ${existing.customer_id},
            ${input.outcome.googleResourceName},
            ${matchedPhone}
          )
          ON CONFLICT (connection_id, customer_id) DO UPDATE
          SET
            google_resource_name = EXCLUDED.google_resource_name,
            matched_phone = EXCLUDED.matched_phone,
            updated_at = NOW()
        `;
        await tx`
          UPDATE google_contacts_connections
          SET
            last_successful_sync_at = NOW(),
            updated_at = NOW()
          WHERE id = ${existing.connection_id}
        `;
      }
    }

    await tx`
      UPDATE google_contacts_connections connection
      SET
        initial_sync_status = 'completed',
        updated_at = NOW()
      WHERE connection.id = ${existing.connection_id}
        AND connection.initial_sync_status = 'pending'
        AND NOT EXISTS (
          SELECT 1
          FROM google_contacts_sync_outbox outbox
          WHERE outbox.connection_id = connection.id
            AND outbox.status IN ('pending', 'processing')
        )
    `;
    return true;
  });
};
