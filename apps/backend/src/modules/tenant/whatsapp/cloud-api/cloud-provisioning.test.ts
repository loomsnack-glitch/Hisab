import { describe, expect, test } from "bun:test";
import {
  cancelCloudProvisioning,
  completeCloudProvisioningStep,
  createCloudProvisioningState,
  failCloudProvisioning,
  resumeCloudProvisioning,
  CloudProvisioningError,
} from "./cloud-provisioning";

describe("Cloud provisioning state", () => {
  test("requires each external step in order and completes idempotently", () => {
    let state = createCloudProvisioningState();
    expect(() =>
      completeCloudProvisioningStep(state, "phone_registered"),
    ).toThrow("is not the current step");

    for (const step of [
      "authorization_received",
      "waba_resolved",
      "system_user_assigned",
      "phone_registered",
      "webhook_subscribed",
      "templates_synced",
      "completed",
    ] as const) {
      state = completeCloudProvisioningStep(state, step);
    }

    expect(state.status).toBe("completed");
    expect(state.completedSteps).toHaveLength(7);
    expect(completeCloudProvisioningStep(state, "completed")).toEqual(state);
  });

  test("records a bounded safe failure and resumes the same step", () => {
    const failed = failCloudProvisioning(
      createCloudProvisioningState(),
      "provider_unavailable",
      "Temporary provider failure\nwith a second line",
    );
    expect(failed).toMatchObject({
      status: "failed",
      currentStep: "authorization_received",
      safeErrorCode: "provider_unavailable",
      safeErrorMessage: "Temporary provider failure with a second line",
    });
    expect(resumeCloudProvisioning(failed)).toMatchObject({
      status: "running",
      currentStep: "authorization_received",
      safeErrorCode: null,
      safeErrorMessage: null,
    });
  });

  test("does not allow invalid errors or terminal retries", () => {
    expect(() =>
      failCloudProvisioning(
        createCloudProvisioningState(),
        "bad code!",
        "failure",
      ),
    ).toThrow(CloudProvisioningError);
    const completedSteps = [
      "authorization_received",
      "waba_resolved",
      "system_user_assigned",
      "phone_registered",
      "webhook_subscribed",
      "templates_synced",
      "completed",
    ] as const;
    const completed = completedSteps.reduce(
      completeCloudProvisioningStep,
      createCloudProvisioningState(),
    );
    expect(() => resumeCloudProvisioning(completed)).toThrow(
      "cannot be resumed",
    );
    expect(() => cancelCloudProvisioning(completed)).toThrow(
      "cannot be cancelled",
    );
  });

  test("cancellation is terminal and explicit", () => {
    const cancelled = cancelCloudProvisioning(createCloudProvisioningState());
    expect(cancelled).toMatchObject({
      status: "cancelled",
      safeErrorCode: "cancelled",
      safeErrorMessage: "Cloud provisioning was cancelled",
    });
    expect(() => resumeCloudProvisioning(cancelled)).toThrow(
      "cannot be resumed",
    );
  });

  test("rejects a database state that does not match the current step", () => {
    expect(() =>
      completeCloudProvisioningStep(
        {
          ...createCloudProvisioningState(),
          completedSteps: ["waba_resolved"],
        },
        "authorization_received",
      ),
    ).toThrow("state is inconsistent");
  });
});
