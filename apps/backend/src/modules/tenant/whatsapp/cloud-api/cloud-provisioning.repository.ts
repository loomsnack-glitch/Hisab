import { pg } from "@/config/db";
import type {
  CloudProvisioningState,
  ProvisioningStep,
} from "./cloud-provisioning";

export type CloudProvisioningAttemptRecord = {
  id: string;
  organizationId: string;
  whatsappAccountId: string | null;
  whatsappBusinessAccountId: string | null;
  idempotencyKey: string;
  providerWabaId: string | null;
  providerPhoneNumberId: string | null;
  credentialReference: string | null;
  credentialKeyVersion: string | null;
  state: CloudProvisioningState;
};

type AttemptRow = Record<string, unknown>;

const stepsFrom = (value: unknown): ProvisioningStep[] => {
  if (!Array.isArray(value)) throw new Error("Cloud provisioning steps are invalid");
  return value as ProvisioningStep[];
};

const mapAttempt = (row: AttemptRow): CloudProvisioningAttemptRecord => ({
  id: String(row.id),
  organizationId: String(row.organization_id),
  whatsappAccountId: row.whatsapp_account_id ? String(row.whatsapp_account_id) : null,
  whatsappBusinessAccountId: row.whatsapp_business_account_id ? String(row.whatsapp_business_account_id) : null,
  idempotencyKey: String(row.idempotency_key),
  providerWabaId: row.provider_waba_id ? String(row.provider_waba_id) : null,
  providerPhoneNumberId: row.provider_phone_number_id ? String(row.provider_phone_number_id) : null,
  credentialReference: row.credential_reference ? String(row.credential_reference) : null,
  credentialKeyVersion: row.credential_key_version ? String(row.credential_key_version) : null,
  state: {
    status: row.status as CloudProvisioningState["status"],
    currentStep: row.current_step as CloudProvisioningState["currentStep"],
    completedSteps: stepsFrom(row.completed_steps),
    safeErrorCode: row.safe_error_code ? String(row.safe_error_code) : null,
    safeErrorMessage: row.safe_error_message ? String(row.safe_error_message) : null,
  },
});

export const getCloudProvisioningAttempt = async (
  organizationId: string,
  idempotencyKey: string,
): Promise<CloudProvisioningAttemptRecord | null> => {
  const [row] = await pg`
    SELECT *
    FROM whatsapp_cloud_provisioning_attempts
    WHERE organization_id = ${organizationId}
      AND idempotency_key = ${idempotencyKey}
  `;
  return row ? mapAttempt(row as AttemptRow) : null;
};

export const createCloudProvisioningAttempt = async (input: {
  organizationId: string;
  createdBy: string;
  idempotencyKey: string;
  providerWabaId: string;
  providerPhoneNumberId: string;
  credentialReference: string;
  credentialKeyVersion: string;
  state: CloudProvisioningState;
}): Promise<CloudProvisioningAttemptRecord> => {
  const [row] = await pg`
    INSERT INTO whatsapp_cloud_provisioning_attempts (
      organization_id, whatsapp_account_id, idempotency_key, status,
      current_step, completed_steps, safe_error_code, safe_error_message,
      provider_waba_id, provider_phone_number_id,
      credential_reference, credential_key_version, created_by
    ) VALUES (
      ${input.organizationId}, NULL, ${input.idempotencyKey}, ${input.state.status},
      ${input.state.currentStep}, ${JSON.stringify(input.state.completedSteps)}::jsonb,
      ${input.state.safeErrorCode}, ${input.state.safeErrorMessage},
      ${input.providerWabaId}, ${input.providerPhoneNumberId},
      ${input.credentialReference}, ${input.credentialKeyVersion}, ${input.createdBy}
    )
    ON CONFLICT (organization_id, idempotency_key)
    DO UPDATE SET updated_at = whatsapp_cloud_provisioning_attempts.updated_at
    RETURNING *
  `;
  if (!row) throw new Error("Cloud provisioning attempt could not be created");
  return mapAttempt(row as AttemptRow);
};

export const updateCloudProvisioningAttempt = async (input: {
  organizationId: string;
  attemptId: string;
  state: CloudProvisioningState;
  whatsappAccountId?: string | null;
  whatsappBusinessAccountId?: string | null;
}): Promise<CloudProvisioningAttemptRecord | null> => {
  const [row] = await pg`
    UPDATE whatsapp_cloud_provisioning_attempts
    SET status = ${input.state.status},
        current_step = ${input.state.currentStep},
        completed_steps = ${JSON.stringify(input.state.completedSteps)}::jsonb,
        safe_error_code = ${input.state.safeErrorCode},
        safe_error_message = ${input.state.safeErrorMessage},
        whatsapp_account_id = COALESCE(${input.whatsappAccountId ?? null}, whatsapp_account_id),
        whatsapp_business_account_id = COALESCE(${input.whatsappBusinessAccountId ?? null}, whatsapp_business_account_id),
        updated_at = NOW()
    WHERE id = ${input.attemptId}
      AND organization_id = ${input.organizationId}
    RETURNING *
  `;
  return row ? mapAttempt(row as AttemptRow) : null;
};
