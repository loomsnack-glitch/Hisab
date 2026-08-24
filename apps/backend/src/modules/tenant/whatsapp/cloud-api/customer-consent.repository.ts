import {
  WhatsAppCustomerConsentEventSchema,
  type WhatsAppCustomerConsentEventDTO,
  type WhatsAppRecordCustomerConsentJSON,
  type WhatsAppSetCustomerSuppressionJSON,
} from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

const bounded = (value: string | null | undefined, maxLength: number): string | null => {
  if (value == null) return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || /[\r\n]/.test(normalized)) {
    throw new Error("Consent metadata is invalid");
  }
  return normalized;
};

const mapEvent = (row: Record<string, unknown>): WhatsAppCustomerConsentEventDTO => {
  const mapped = snakeToCamel(row) as Record<string, unknown>;
  return WhatsAppCustomerConsentEventSchema.parse({
    id: mapped.id,
    organizationId: mapped.organizationId,
    customerId: mapped.customerId,
    kind: mapped.kind,
    state: mapped.state,
    source: mapped.source,
    wordingVersion: mapped.wordingVersion ?? null,
    evidenceReference: mapped.evidenceReference ?? null,
    reason: mapped.reason ?? null,
    createdBy: mapped.createdBy ?? null,
    createdAt: mapped.createdAt,
  });
};

export const recordCustomerConsent = async (
  organizationId: string,
  customerId: string,
  createdBy: string,
  input: WhatsAppRecordCustomerConsentJSON,
): Promise<WhatsAppCustomerConsentEventDTO | null> => pg.begin(async tx => {
  const wordingVersion = bounded(input.wordingVersion, 64);
  const evidenceReference = bounded(input.evidenceReference, 255);
  const reason = bounded(input.reason, 1000);
  const [customer] = await tx`
    SELECT id
    FROM customers
    WHERE id = ${customerId} AND organization_id = ${organizationId}
  `;
  if (!customer) return null;

  const [event] = await tx`
    INSERT INTO whatsapp_customer_consent_events (
      organization_id, customer_id, kind, state, source,
      wording_version, evidence_reference, reason, created_by
    ) VALUES (
      ${organizationId}, ${customerId}, ${input.kind}::whatsapp_customer_consent_kind_enum,
      ${input.state}::whatsapp_customer_consent_state_enum,
      ${input.source}::whatsapp_customer_consent_source_enum,
      ${wordingVersion}, ${evidenceReference}, ${reason}, ${createdBy}
    )
    RETURNING *
  `;

  if (input.kind === "marketing") {
    await tx`
      UPDATE customers
      SET marketing_opted_in = ${input.state === "opted_in"},
          marketing_opted_in_at = CASE WHEN ${input.state === "opted_in"} THEN NOW() ELSE NULL END,
          marketing_opt_in_source = CASE WHEN ${input.state === "opted_in"} THEN ${input.source}::whatsapp_customer_consent_source_enum ELSE NULL END,
          marketing_opted_out = ${input.state === "opted_out"},
          marketing_opted_out_at = CASE WHEN ${input.state === "opted_out"} THEN NOW() ELSE NULL END,
          updated_at = NOW()
      WHERE id = ${customerId} AND organization_id = ${organizationId}
    `;
  } else {
    await tx`
      UPDATE customers
      SET utility_opted_in = ${input.state === "opted_in"},
          utility_opted_in_at = CASE WHEN ${input.state === "opted_in"} THEN NOW() ELSE NULL END,
          utility_opt_in_source = CASE WHEN ${input.state === "opted_in"} THEN ${input.source}::whatsapp_customer_consent_source_enum ELSE NULL END,
          updated_at = NOW()
      WHERE id = ${customerId} AND organization_id = ${organizationId}
    `;
  }
  return event ? mapEvent(event as Record<string, unknown>) : null;
});

export const setCustomerSuppression = async (
  organizationId: string,
  customerId: string,
  createdBy: string | null,
  input: WhatsAppSetCustomerSuppressionJSON,
): Promise<WhatsAppCustomerConsentEventDTO | null> => pg.begin(async tx => {
  const reason = bounded(input.reason, 1000);
  const evidenceReference = bounded(input.evidenceReference, 255);
  const [customer] = await tx`
    SELECT id
    FROM customers
    WHERE id = ${customerId} AND organization_id = ${organizationId}
  `;
  if (!customer) return null;
  const [event] = await tx`
    INSERT INTO whatsapp_customer_consent_events (
      organization_id, customer_id, kind, state, source,
      evidence_reference, reason, created_by
    ) VALUES (
      ${organizationId}, ${customerId}, 'suppression'::whatsapp_customer_consent_kind_enum,
      ${input.suppressed ? "suppressed" : "cleared"}::whatsapp_customer_consent_state_enum,
      ${input.source}::whatsapp_customer_consent_source_enum,
      ${evidenceReference}, ${reason}, ${createdBy}
    )
    RETURNING *
  `;
  await tx`
    UPDATE customers
    SET whatsapp_suppressed = ${input.suppressed},
        whatsapp_suppressed_at = CASE WHEN ${input.suppressed} THEN NOW() ELSE NULL END,
        whatsapp_suppression_reason = CASE WHEN ${input.suppressed} THEN ${reason} ELSE NULL END,
        updated_at = NOW()
    WHERE id = ${customerId} AND organization_id = ${organizationId}
  `;
  return event ? mapEvent(event as Record<string, unknown>) : null;
});

export const listCustomerConsentEvents = async (
  organizationId: string,
  customerId: string,
  limit = 100,
): Promise<WhatsAppCustomerConsentEventDTO[] | null> => {
  const [customer] = await pg`
    SELECT id
    FROM customers
    WHERE id = ${customerId} AND organization_id = ${organizationId}
  `;
  if (!customer) return null;
  const rows = await pg`
    SELECT *
    FROM whatsapp_customer_consent_events
    WHERE organization_id = ${organizationId} AND customer_id = ${customerId}
    ORDER BY created_at DESC, id DESC
    LIMIT ${Math.min(Math.max(limit, 1), 100)}
  `;
  return rows.map((row: Record<string, unknown>) => mapEvent(row));
};

export const getCustomerMessagingState = async (organizationId: string, customerId: string) => {
  const [row] = await pg`
    SELECT id, name, phone, marketing_opted_in, marketing_opted_out,
           utility_opted_in, whatsapp_suppressed
    FROM customers
    WHERE id = ${customerId} AND organization_id = ${organizationId}
  `;
  if (!row) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    phone: row.phone == null ? null : String(row.phone),
    marketingOptedIn: Boolean(row.marketing_opted_in),
    marketingOptedOut: Boolean(row.marketing_opted_out),
    utilityOptedIn: Boolean(row.utility_opted_in),
    whatsappSuppressed: Boolean(row.whatsapp_suppressed),
  };
};
