import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { CustomerDTO, DeviceSessionDTO } from "@repo/types";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const customerId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const now = "2026-08-26T12:00:00.000Z";

const organization = {
  id: organizationId,
  name: "Demo Org",
  createdBy: userId,
};

const store = {
  id: storeId,
  organizationId,
  name: "Main Store",
  kotSystemEnabled: true,
  tableManagementEnabled: false,
};

const deviceSession = {
  device: {
    id: "17171717-1717-4171-8171-171717171717",
    organizationId,
    storeId,
    name: "Counter",
    loginUsername: "counter",
    status: "active",
    lastSeenAt: null,
  },
  store: { ...store, address: null },
  organization: { id: organizationId, name: "Demo Org", username: "demo", tagline: null },
} satisfies DeviceSessionDTO;

const customerRecord = (overrides: Partial<CustomerDTO> = {}): CustomerDTO => ({
  id: customerId,
  organizationId,
  name: "Dev Jariwala",
  phone: "+919876543210",
  balance: 0,
  isActive: true,
  marketingOptedOut: false,
  marketingOptedIn: false,
  marketingOptedInAt: null,
  marketingOptInSource: null,
  utilityOptedIn: true,
  utilityOptedInAt: null,
  utilityOptInSource: null,
  whatsappSuppressed: false,
  whatsappSuppressedAt: null,
  whatsappSuppressionReason: null,
  createdBy: userId,
  updatedBy: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const billingRepository = await import("./billing.repository");
const organizationRepository = await import("@/modules/tenant/organization/organization.repository");
const googleContactsOutbox = await import("@/modules/tenant/google-contacts/google-contacts.outbox");
const { pg } = await import("@/config/db");
const billingService = await import("./billing.service");

describe("Google Contacts automatic Customer synchronization", () => {
  let createCustomer: ReturnType<typeof spyOn>;
  let updateCustomer: ReturnType<typeof spyOn>;
  let getCustomerById: ReturnType<typeof spyOn>;

  beforeEach(() => {
    spyOn(pg, "begin").mockImplementation((async <T>(callback: (tx: unknown) => Promise<T>) =>
      callback({})) as typeof pg.begin);
    spyOn(organizationRepository, "getOrganizationByIdForUser").mockImplementation(async () => organization as never);
    spyOn(organizationRepository, "getOrganizationById").mockImplementation(async () => organization as never);
    spyOn(organizationRepository, "getStoreById").mockImplementation(async () => store as never);
    createCustomer = spyOn(billingRepository, "createCustomer").mockImplementation(async () => customerRecord());
    updateCustomer = spyOn(billingRepository, "updateCustomer").mockImplementation(async () =>
      customerRecord({ name: "Dev Jariwala" }),
    );
    getCustomerById = spyOn(billingRepository, "getCustomerById").mockImplementation(async () =>
      customerRecord({ name: "Dev" }),
    );
    spyOn(billingRepository, "customerPhoneExistsInOrganization").mockImplementation(async () => false);
    spyOn(googleContactsOutbox, "scheduleGoogleContactsCustomerChange").mockImplementation(async () => {});
  });

  afterEach(() => {
    mock.restore();
  });

  test("Admin Customer creation schedules eligible work and returns without waiting for Google", async () => {
    const response = await billingService.createCustomer(userId, organizationId, {
      name: "Dev Jariwala",
      phone: "+919876543210",
    });

    expect(response).toMatchObject({
      status: "success",
      code: 201,
      data: { customer: { id: customerId, phone: "+919876543210" } },
    });
    expect(googleContactsOutbox.scheduleGoogleContactsCustomerChange).toHaveBeenCalledWith(
      {
        organizationId,
        customerId,
        customerUpdatedAt: now,
        phone: "+919876543210",
      },
      {},
    );
  });

  test("POS Customer creation schedules the same eligible work as Admin", async () => {
    const response = await billingService.createCustomerForDevice(deviceSession, {
      name: "Dev Jariwala",
      phone: "+919876543210",
    });

    expect(response).toMatchObject({ status: "success", code: 201 });
    expect(googleContactsOutbox.scheduleGoogleContactsCustomerChange).toHaveBeenCalledWith(
      {
        organizationId,
        customerId,
        customerUpdatedAt: now,
        phone: "+919876543210",
      },
      {},
    );
  });

  test("does not schedule work when a Customer is created without a phone", async () => {
    createCustomer.mockImplementation(async () => customerRecord({ phone: null }));

    const response = await billingService.createCustomer(userId, organizationId, {
      name: "Walk In",
    });

    expect(response).toMatchObject({ status: "success", code: 201 });
    expect(googleContactsOutbox.scheduleGoogleContactsCustomerChange).not.toHaveBeenCalled();
  });

  test("Admin name and phone edits schedule a fresh sync", async () => {
    updateCustomer.mockImplementation(async () =>
      customerRecord({ name: "Dev Jariwala", phone: "+918888888888", updatedBy: userId }),
    );

    const response = await billingService.updateCustomer(userId, organizationId, customerId, {
      name: "Dev Jariwala",
      phone: "+918888888888",
    });

    expect(response).toMatchObject({ status: "success", code: 200 });
    expect(googleContactsOutbox.scheduleGoogleContactsCustomerChange).toHaveBeenCalledWith(
      {
        organizationId,
        customerId,
        customerUpdatedAt: now,
        phone: "+918888888888",
      },
      {},
    );
  });

  test("POS Customer edits schedule the same sync as Admin", async () => {
    const response = await billingService.updateCustomerForDevice(deviceSession, customerId, {
      name: "Dev Jariwala",
    });

    expect(response).toMatchObject({ status: "success", code: 200 });
    expect(googleContactsOutbox.scheduleGoogleContactsCustomerChange).toHaveBeenCalledTimes(1);
  });

  test("removing a Customer phone schedules skip work and never calls Google", async () => {
    updateCustomer.mockImplementation(async () =>
      customerRecord({ phone: null, updatedBy: userId }),
    );

    const response = await billingService.updateCustomer(userId, organizationId, customerId, {
      phone: "",
    });

    expect(response).toMatchObject({ status: "success", code: 200 });
    expect(googleContactsOutbox.scheduleGoogleContactsCustomerChange).toHaveBeenCalledWith(
      {
        organizationId,
        customerId,
        customerUpdatedAt: now,
        phone: null,
      },
      {},
    );
  });

  test("unrelated Customer edits do not schedule Google Contacts work", async () => {
    getCustomerById.mockImplementation(async () => customerRecord());
    updateCustomer.mockImplementation(async () =>
      customerRecord({ isActive: false, updatedBy: userId }),
    );

    const response = await billingService.updateCustomer(userId, organizationId, customerId, {
      isActive: false,
    });

    expect(response).toMatchObject({ status: "success", code: 200 });
    expect(googleContactsOutbox.scheduleGoogleContactsCustomerChange).not.toHaveBeenCalled();
  });
});
