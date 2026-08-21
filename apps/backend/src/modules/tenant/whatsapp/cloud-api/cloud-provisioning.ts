import type {
  WhatsAppCloudProvisioningStatus,
  WhatsAppCloudProvisioningStep,
} from "@repo/types";

export const CLOUD_PROVISIONING_STEP_ORDER = [
  "authorization_received",
  "waba_resolved",
  "system_user_assigned",
  "phone_registered",
  "webhook_subscribed",
  "templates_synced",
  "completed",
] as const satisfies readonly WhatsAppCloudProvisioningStep[];

export type ProvisioningStep = (typeof CLOUD_PROVISIONING_STEP_ORDER)[number];

export type CloudProvisioningState = {
  status: WhatsAppCloudProvisioningStatus;
  currentStep: ProvisioningStep;
  completedSteps: ProvisioningStep[];
  safeErrorCode: string | null;
  safeErrorMessage: string | null;
};

export class CloudProvisioningError extends Error {
  readonly code: "invalid_transition" | "invalid_error" | "terminal_attempt";

  constructor(code: CloudProvisioningError["code"], message: string) {
    super(message);
    this.name = "CloudProvisioningError";
    this.code = code;
  }
}

const MAX_ERROR_CODE_LENGTH = 100;
const MAX_ERROR_MESSAGE_LENGTH = 1_000;

const cloneState = (state: CloudProvisioningState): CloudProvisioningState => ({
  ...state,
  completedSteps: [...state.completedSteps],
});

const stepIndex = (step: ProvisioningStep): number =>
  CLOUD_PROVISIONING_STEP_ORDER.indexOf(step);

const sameSteps = (
  left: readonly ProvisioningStep[],
  right: readonly ProvisioningStep[],
): boolean =>
  left.length === right.length &&
  left.every((step, index) => step === right[index]);

const assertValidState = (state: CloudProvisioningState): void => {
  const currentIndex = stepIndex(state.currentStep);
  const expectedSteps =
    state.status === "completed"
      ? CLOUD_PROVISIONING_STEP_ORDER
      : CLOUD_PROVISIONING_STEP_ORDER.slice(0, currentIndex);
  if (
    currentIndex < 0 ||
    (state.status === "completed" && state.currentStep !== "completed") ||
    !sameSteps(state.completedSteps, expectedSteps)
  ) {
    throw new CloudProvisioningError(
      "invalid_transition",
      "Cloud provisioning state is inconsistent",
    );
  }
};

const safeError = (code: string, message: string) => {
  const normalizedCode = code.trim();
  const normalizedMessage = message.trim().replace(/[\r\n]+/g, " ");
  if (
    !/^[a-z0-9_:-]+$/i.test(normalizedCode) ||
    normalizedCode.length > MAX_ERROR_CODE_LENGTH ||
    !normalizedMessage ||
    normalizedMessage.length > MAX_ERROR_MESSAGE_LENGTH
  ) {
    throw new CloudProvisioningError(
      "invalid_error",
      "Cloud provisioning error metadata is invalid",
    );
  }
  return {
    code: normalizedCode,
    message: normalizedMessage,
  };
};

export const createCloudProvisioningState = (): CloudProvisioningState => ({
  status: "running",
  currentStep: "authorization_received",
  completedSteps: [],
  safeErrorCode: null,
  safeErrorMessage: null,
});

export const completeCloudProvisioningStep = (
  input: CloudProvisioningState,
  step: ProvisioningStep,
): CloudProvisioningState => {
  assertValidState(input);
  if (input.status === "completed" && input.completedSteps.includes(step)) {
    return cloneState(input);
  }
  if (input.status !== "running") {
    throw new CloudProvisioningError(
      "terminal_attempt",
      "Cloud provisioning attempt is not running",
    );
  }
  if (input.completedSteps.includes(step)) return cloneState(input);
  if (input.currentStep !== step) {
    throw new CloudProvisioningError(
      "invalid_transition",
      `Cloud provisioning step ${step} is not the current step`,
    );
  }

  const completedSteps = [...input.completedSteps, step];
  const next = CLOUD_PROVISIONING_STEP_ORDER[stepIndex(step) + 1];
  return {
    ...input,
    status: step === "completed" ? "completed" : "running",
    currentStep: next ?? "completed",
    completedSteps,
    safeErrorCode: null,
    safeErrorMessage: null,
  };
};

export const failCloudProvisioning = (
  input: CloudProvisioningState,
  code: string,
  message: string,
): CloudProvisioningState => {
  assertValidState(input);
  if (input.status === "completed" || input.status === "cancelled") {
    throw new CloudProvisioningError(
      "terminal_attempt",
      "Cloud provisioning attempt is not resumable",
    );
  }
  const error = safeError(code, message);
  return {
    ...cloneState(input),
    status: "failed",
    safeErrorCode: error.code,
    safeErrorMessage: error.message,
  };
};

export const resumeCloudProvisioning = (
  input: CloudProvisioningState,
): CloudProvisioningState => {
  assertValidState(input);
  if (input.status === "completed" || input.status === "cancelled") {
    throw new CloudProvisioningError(
      "terminal_attempt",
      "Cloud provisioning attempt cannot be resumed",
    );
  }
  return {
    ...cloneState(input),
    status: "running",
    safeErrorCode: null,
    safeErrorMessage: null,
  };
};

export const cancelCloudProvisioning = (
  input: CloudProvisioningState,
): CloudProvisioningState => {
  assertValidState(input);
  if (input.status === "completed") {
    throw new CloudProvisioningError(
      "terminal_attempt",
      "Completed Cloud provisioning cannot be cancelled",
    );
  }
  return {
    ...cloneState(input),
    status: "cancelled",
    safeErrorCode: "cancelled",
    safeErrorMessage: "Cloud provisioning was cancelled",
  };
};
