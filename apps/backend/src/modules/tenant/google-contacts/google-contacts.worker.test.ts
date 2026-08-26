import { describe, expect, mock, test } from "bun:test";
import type { GooglePeopleClient } from "./google-contacts.people";
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
      updateContact: mock(async (person) => person),
    });

    const outcome = await processGoogleContactsSyncJob(job, people);

    expect(outcome).toEqual({
      status: "updated",
      googleResourceName: "people/dev",
    });
    expect(people.createContact).not.toHaveBeenCalled();
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
    expect(people.searchContacts).not.toHaveBeenCalled();
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

    const outcome = await processGoogleContactsSyncJob(
      { ...job, connectionStatus: "reconnect_required" },
      people,
    );

    expect(outcome).toEqual({ status: "skipped", reason: "connection_inactive" });
    expect(people.searchContacts).not.toHaveBeenCalled();
    expect(people.deleteContact).not.toHaveBeenCalled();
  });
});
