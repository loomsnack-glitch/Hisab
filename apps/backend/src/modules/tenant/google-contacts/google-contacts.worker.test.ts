import { describe, expect, mock, test } from "bun:test";
import type { GooglePeopleClient } from "./google-contacts.people";
import { GooglePeopleApiError } from "./google-contacts.people-client";
import { processGoogleContactsSyncJob } from "./google-contacts.worker";

const job = {
  outboxId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  connectionId: "33333333-3333-4333-8333-333333333333",
  customerId: "44444444-4444-4444-8444-444444444444",
  connectionStatus: "connected" as const,
  customerName: "Dev Jariwala",
  customerPhone: "+919876543210",
  customerUpdatedAt: "2026-08-26T12:00:00.000Z",
  linkedGoogleResourceName: null as string | null,
  matchedPhone: null as string | null,
};

const createPeople = (
  overrides: Partial<GooglePeopleClient> = {},
): GooglePeopleClient & { deleteContact: ReturnType<typeof mock> } => {
  const deleteContact = mock(async () => {
    throw new Error("Google Contact deletion must never be issued");
  });
  return {
    searchContacts: mock(async () => []),
    getContact: mock(async () => {
      throw new Error("getContact should not be used without a linked Google Contact");
    }),
    createContact: mock(async () => ({
      resourceName: "people/created",
      etag: "created-etag",
      names: [{ unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" }],
      phoneNumbers: [{ value: "+919876543210" }],
    })),
    updateContact: mock(async (person) => person),
    ...overrides,
    deleteContact,
  };
};

describe("Google Contacts worker", () => {
  test("creates a Google Contact when no exact phone match exists", async () => {
    const people = createPeople({
      searchContacts: mock(async () => [
        {
          resourceName: "people/prefix",
          phoneNumbers: [{ value: "+9198765432109" }],
        },
      ]),
    });

    const outcome = await processGoogleContactsSyncJob(job, people);

    expect(outcome).toEqual({
      status: "created",
      googleResourceName: "people/created",
    });
    expect(people.createContact).toHaveBeenCalledWith({
      name: "Dev Jariwala",
      phone: "+919876543210",
    });
    expect(people.updateContact).not.toHaveBeenCalled();
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("updates exactly one Google Contact Match from Ganatri and preserves extra numbers", async () => {
    const matched = {
      resourceName: "people/dev",
      etag: "etag-1",
      names: [{ unstructuredName: "Dev", givenName: "Dev" }],
      phoneNumbers: [
        { value: "+14155552671", type: "home" },
        { value: "9876543210", canonicalForm: "+919876543210" },
      ],
    };
    const people = createPeople({
      searchContacts: mock(async () => [matched]),
      getContact: mock(async () => matched),
      updateContact: mock(async (person) => person),
    });

    const outcome = await processGoogleContactsSyncJob(job, people);

    expect(outcome).toEqual({
      status: "updated",
      googleResourceName: "people/dev",
    });
    expect(people.createContact).not.toHaveBeenCalled();
    expect(people.getContact).toHaveBeenCalledWith("people/dev");
    expect(people.updateContact).toHaveBeenCalledWith({
      resourceName: "people/dev",
      etag: "etag-1",
      names: [{ unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" }],
      phoneNumbers: [
        { value: "+14155552671", type: "home" },
        { value: "+919876543210", canonicalForm: "+919876543210" },
      ],
    });
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("updates a linked Google Contact when the Customer name or phone changes", async () => {
    const linked = {
      resourceName: "people/dev",
      etag: "etag-2",
      names: [{ unstructuredName: "Dev", givenName: "Dev" }],
      phoneNumbers: [
        { value: "+14155552671", type: "home" },
        { value: "+919876543210", canonicalForm: "+919876543210" },
      ],
    };
    const people = createPeople({
      getContact: mock(async () => linked),
      updateContact: mock(async (person) => person),
    });

    const outcome = await processGoogleContactsSyncJob(
      {
        ...job,
        customerName: "Dev Jariwala",
        customerPhone: "+918888888888",
        linkedGoogleResourceName: "people/dev",
        matchedPhone: "+919876543210",
      },
      people,
    );

    expect(outcome).toEqual({
      status: "updated",
      googleResourceName: "people/dev",
    });
    expect(people.getContact).toHaveBeenCalledWith("people/dev");
    expect(people.createContact).not.toHaveBeenCalled();
    expect(people.updateContact).toHaveBeenCalledWith({
      resourceName: "people/dev",
      etag: "etag-2",
      names: [{ unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" }],
      phoneNumbers: [
        { value: "+14155552671", type: "home" },
        { value: "+918888888888", canonicalForm: "+918888888888" },
      ],
    });
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("skips a Customer without a phone and never calls Google", async () => {
    const people = createPeople();

    const outcome = await processGoogleContactsSyncJob(
      { ...job, customerPhone: null },
      people,
    );

    expect(outcome).toEqual({ status: "skipped", reason: "ineligible" });
    expect(people.searchContacts).not.toHaveBeenCalled();
    expect(people.getContact).not.toHaveBeenCalled();
    expect(people.createContact).not.toHaveBeenCalled();
    expect(people.updateContact).not.toHaveBeenCalled();
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("records a conflict and changes no Google Contact when more than one exact match exists", async () => {
    const people = createPeople({
      searchContacts: mock(async () => [
        {
          resourceName: "people/a",
          phoneNumbers: [{ value: "+919876543210" }],
        },
        {
          resourceName: "people/b",
          phoneNumbers: [{ canonicalForm: "+919876543210" }],
        },
      ]),
    });

    const outcome = await processGoogleContactsSyncJob(job, people);

    expect(outcome).toEqual({ status: "conflict", reason: "multiple_matches" });
    expect(people.createContact).not.toHaveBeenCalled();
    expect(people.updateContact).not.toHaveBeenCalled();
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("skips work when the Google Contacts Connection is no longer connected", async () => {
    const people = createPeople();

    const reconnectRequired = await processGoogleContactsSyncJob(
      { ...job, connectionStatus: "reconnect_required" },
      people,
    );
    const disconnected = await processGoogleContactsSyncJob(
      { ...job, connectionStatus: "disconnected" },
      people,
    );

    expect(reconnectRequired).toEqual({ status: "skipped", reason: "connection_inactive" });
    expect(disconnected).toEqual({ status: "skipped", reason: "connection_inactive" });
    expect(people.searchContacts).not.toHaveBeenCalled();
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("records a phone collision after a Customer phone change and modifies no Google Contact", async () => {
    const linked = {
      resourceName: "people/dev",
      etag: "etag-linked",
      names: [{ unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" }],
      phoneNumbers: [{ value: "+919876543210" }],
    };
    const people = createPeople({
      getContact: mock(async () => linked),
      searchContacts: mock(async () => [
        {
          resourceName: "people/other",
          phoneNumbers: [{ value: "+918888888888" }],
        },
      ]),
    });

    const outcome = await processGoogleContactsSyncJob(
      {
        ...job,
        customerPhone: "+918888888888",
        linkedGoogleResourceName: "people/dev",
        matchedPhone: "+919876543210",
      },
      people,
    );

    expect(outcome).toEqual({ status: "conflict", reason: "phone_collision" });
    expect(people.searchContacts).toHaveBeenCalled();
    expect(people.updateContact).not.toHaveBeenCalled();
    expect(people.createContact).not.toHaveBeenCalled();
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("recreates a linked Google Contact that was deleted in Google", async () => {
    const people = createPeople({
      getContact: mock(async () => {
        throw new GooglePeopleApiError(404, "Google Contact was not found");
      }),
      searchContacts: mock(async () => []),
    });

    const outcome = await processGoogleContactsSyncJob(
      {
        ...job,
        linkedGoogleResourceName: "people/deleted",
        matchedPhone: "+919876543210",
      },
      people,
    );

    expect(outcome).toEqual({
      status: "created",
      googleResourceName: "people/created",
    });
    expect(people.getContact).toHaveBeenCalledWith("people/deleted");
    expect(people.createContact).toHaveBeenCalledWith({
      name: "Dev Jariwala",
      phone: "+919876543210",
    });
    expect(people.updateContact).not.toHaveBeenCalled();
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("repairs Google-side name and linked-phone edits from Ganatri without importing Google data", async () => {
    const linked = {
      resourceName: "people/dev",
      etag: "etag-google-edit",
      names: [{ unstructuredName: "Google Edited Name", givenName: "Google" }],
      phoneNumbers: [
        { value: "+14155552671", type: "home" },
        { value: "09876 543210", canonicalForm: "+919876543210" },
      ],
      emailAddresses: [{ value: "kept@example.com" }],
      biographies: [{ value: "Client notes" }],
    };
    const people = createPeople({
      getContact: mock(async () => linked),
      updateContact: mock(async (person) => person),
    });

    const outcome = await processGoogleContactsSyncJob(
      {
        ...job,
        customerName: "Dev Jariwala",
        customerPhone: "+919876543210",
        linkedGoogleResourceName: "people/dev",
        matchedPhone: "+919876543210",
      },
      people,
    );

    expect(outcome).toEqual({
      status: "updated",
      googleResourceName: "people/dev",
    });
    expect(people.updateContact).toHaveBeenCalledWith({
      resourceName: "people/dev",
      etag: "etag-google-edit",
      names: [{ unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" }],
      phoneNumbers: [
        { value: "+14155552671", type: "home" },
        { value: "+919876543210", canonicalForm: "+919876543210" },
      ],
      emailAddresses: [{ value: "kept@example.com" }],
      biographies: [{ value: "Client notes" }],
    });
    expect(JSON.stringify(outcome)).not.toContain("Google Edited Name");
    expect(JSON.stringify(outcome)).not.toContain("kept@example.com");
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("reloads current Google metadata after a concurrent edit and retries the Ganatri-owned merge", async () => {
    const stale = {
      resourceName: "people/dev",
      etag: "etag-stale",
      names: [{ unstructuredName: "Dev", givenName: "Dev" }],
      phoneNumbers: [{ value: "+919876543210" }],
      emailAddresses: [{ value: "old@example.com" }],
    };
    const current = {
      resourceName: "people/dev",
      etag: "etag-current",
      names: [{ unstructuredName: "Google race", givenName: "Google" }],
      phoneNumbers: [
        { value: "+919876543210" },
        { value: "+14155552671", type: "home" },
      ],
      emailAddresses: [{ value: "fresh@example.com" }],
    };
    const people = createPeople({
      getContact: mock(async () => stale),
      updateContact: mock(async (person) => {
        if (person.etag === "etag-stale") {
          people.getContact = mock(async () => current);
          throw new GooglePeopleApiError(409, "Google Contact was modified");
        }
        return person;
      }),
    });

    const outcome = await processGoogleContactsSyncJob(
      {
        ...job,
        linkedGoogleResourceName: "people/dev",
        matchedPhone: "+919876543210",
      },
      people,
    );

    expect(outcome).toEqual({
      status: "updated",
      googleResourceName: "people/dev",
    });
    expect(people.updateContact).toHaveBeenCalledTimes(2);
    expect(people.updateContact).toHaveBeenLastCalledWith({
      resourceName: "people/dev",
      etag: "etag-current",
      names: [{ unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" }],
      phoneNumbers: [
        { value: "+919876543210" },
        { value: "+14155552671", type: "home" },
      ],
      emailAddresses: [{ value: "fresh@example.com" }],
    });
    expect(people.deleteContact).not.toHaveBeenCalled();
  });

  test("classifies rate-limit failures as retryable and authorization loss as reconnect-required", async () => {
    const rateLimited = createPeople({
      searchContacts: mock(async () => {
        throw new GooglePeopleApiError(429, "Google Contacts is temporarily unavailable");
      }),
    });
    const unauthorized = createPeople({
      searchContacts: mock(async () => {
        throw new GooglePeopleApiError(401, "Google Contacts authorization is no longer valid");
      }),
    });
    const permanent = createPeople({
      searchContacts: mock(async () => {
        throw new GooglePeopleApiError(400, "Google Contacts could not be updated");
      }),
    });

    expect(await processGoogleContactsSyncJob(job, rateLimited)).toEqual({
      status: "retryable",
      code: "google_unavailable",
      message: "Google Contacts is temporarily unavailable",
    });
    expect(await processGoogleContactsSyncJob(job, unauthorized)).toEqual({
      status: "reconnect_required",
      code: "google_reconnect_required",
      message: "Google Contacts authorization is no longer valid",
    });
    expect(await processGoogleContactsSyncJob(job, permanent)).toEqual({
      status: "failed",
      code: "google_write_failed",
      message: "Google Contacts could not be updated",
    });
    expect(rateLimited.deleteContact).not.toHaveBeenCalled();
    expect(unauthorized.deleteContact).not.toHaveBeenCalled();
    expect(permanent.createContact).not.toHaveBeenCalled();
    expect(permanent.updateContact).not.toHaveBeenCalled();
    expect(permanent.deleteContact).not.toHaveBeenCalled();
  });
});
