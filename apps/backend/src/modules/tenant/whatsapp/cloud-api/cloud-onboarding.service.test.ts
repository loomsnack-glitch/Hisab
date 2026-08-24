import { beforeEach, describe, expect, mock, test } from "bun:test";

type Organization = { id: string };
type CreateStateRecordInput = {
  organizationId: string;
  userId: string;
  nonce: string;
  expiresAt: string;
};

const organization: Organization = {
  id: "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865",
};
const getOrganizationByIdForUser = mock(
  async (
    _organizationId: string,
    _userId: string,
  ): Promise<Organization | null> => organization,
);
const createCloudOnboardingStateRecord = mock(
  async (_input: CreateStateRecordInput): Promise<void> => {},
);

mock.module("@/modules/tenant/organization/organization.repository", () => ({
  getOrganizationByIdForUser,
}));
mock.module("./cloud-onboarding.repository", () => ({
  createCloudOnboardingStateRecord,
}));

const { startCloudOnboarding } = await import("./cloud-onboarding.service");

const USER_ID = "17268fe9-9f75-4ebe-9997-9d73b2a3e996";
const ORGANIZATION_ID = "aac5e7a9-7b0d-4842-ab6c-ab2f4e21b865";

describe("Cloud onboarding service", () => {
  beforeEach(() => {
    getOrganizationByIdForUser.mockClear();
    createCloudOnboardingStateRecord.mockClear();
    getOrganizationByIdForUser.mockResolvedValue(organization);
    process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET =
      "local-test-secret-that-is-long-enough-32";
  });

  test("does not create state for an organization the user cannot access", async () => {
    getOrganizationByIdForUser.mockResolvedValue(null);

    const response = await startCloudOnboarding(USER_ID, ORGANIZATION_ID);

    expect(response).toMatchObject({ status: "error", code: 404, data: null });
    expect(createCloudOnboardingStateRecord).not.toHaveBeenCalled();
  });

  test("persists the nonce binding and returns only the signed state response", async () => {
    const response = await startCloudOnboarding(USER_ID, ORGANIZATION_ID);

    expect(response).toMatchObject({
      status: "success",
      code: 201,
      data: { state: expect.any(String), expiresAt: expect.any(String) },
    });
    const persisted = createCloudOnboardingStateRecord.mock.calls[0]?.[0] as
      | CreateStateRecordInput
      | undefined;
    expect(persisted).toMatchObject({
      organizationId: ORGANIZATION_ID,
      userId: USER_ID,
      nonce: expect.stringMatching(/^[A-Za-z0-9_-]{32,128}$/),
      expiresAt: expect.any(String),
    });
    expect(response.data).not.toHaveProperty("nonce");
    expect((response.data as { state: string }).state).not.toBe(
      persisted?.nonce,
    );
  });

  test("reports missing state-secret configuration without exposing internals", async () => {
    delete process.env.WHATSAPP_CLOUD_ONBOARDING_STATE_SECRET;

    const response = await startCloudOnboarding(USER_ID, ORGANIZATION_ID);

    expect(response).toMatchObject({
      status: "error",
      code: 503,
      message: "WhatsApp Cloud onboarding is not configured",
      data: null,
    });
    expect(createCloudOnboardingStateRecord).not.toHaveBeenCalled();
  });
});
