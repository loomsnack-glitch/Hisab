import { afterEach, describe, expect, mock, test } from "bun:test";
import {
  createGooglePeopleClient,
  GooglePeopleApiError,
} from "./google-contacts.people-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const stubFetch = (
  impl: (url: string, init?: RequestInit) => Promise<Response>,
): void => {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) =>
    impl(String(input), init)) as unknown as typeof fetch;
};

describe("Google People client", () => {
  test("updates only the name and phone fields while sending the current etag", async () => {
    const fetchMock = mock(async (url: string, init?: RequestInit) => {
      expect(url).toContain("people/dev:updateContact");
      expect(url).toContain("updatePersonFields=names%2CphoneNumbers");
      expect(init?.method).toBe("PATCH");
      expect(init?.method?.toLowerCase()).not.toBe("delete");
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      expect(body).toEqual({
        resourceName: "people/dev",
        etag: "etag-current",
        names: [{ unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" }],
        phoneNumbers: [{ value: "+919876543210" }],
      });
      expect(JSON.stringify(body)).not.toContain("emailAddresses");
      return jsonResponse(200, {
        resourceName: "people/dev",
        etag: "etag-next",
        names: body.names,
        phoneNumbers: body.phoneNumbers,
      });
    });
    stubFetch(fetchMock);

    const updated = await createGooglePeopleClient("access-token-must-not-escape").updateContact({
      resourceName: "people/dev",
      etag: "etag-current",
      names: [{ unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" }],
      phoneNumbers: [{ value: "+919876543210" }],
      emailAddresses: [{ value: "kept@example.com" }],
      biographies: [{ value: "Client notes" }],
    });

    expect(updated.resourceName).toBe("people/dev");
    expect(updated.etag).toBe("etag-next");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("loads current contact metadata and extra Google fields without importing them as Customers", async () => {
    stubFetch(async () =>
      jsonResponse(200, {
        resourceName: "people/dev",
        etag: "etag-live",
        names: [{ unstructuredName: "Google Edited Name" }],
        phoneNumbers: [{ value: "+919876543210" }],
        emailAddresses: [{ value: "kept@example.com" }],
        addresses: [{ formattedValue: "1 Market St" }],
        biographies: [{ value: "Client notes" }],
        photos: [{ url: "https://example.com/photo.jpg" }],
        memberships: [{ contactGroupMembership: { contactGroupResourceName: "contactGroups/friends" } }],
      }),
    );

    const person = await createGooglePeopleClient("access-token").getContact("people/dev");

    expect(person).toMatchObject({
      resourceName: "people/dev",
      etag: "etag-live",
      emailAddresses: [{ value: "kept@example.com" }],
      addresses: [{ formattedValue: "1 Market St" }],
      biographies: [{ value: "Client notes" }],
      photos: [{ url: "https://example.com/photo.jpg" }],
      memberships: [{ contactGroupMembership: { contactGroupResourceName: "contactGroups/friends" } }],
    });
  });

  test("classifies rate-limit, concurrent-edit, and authorization failures", async () => {
    stubFetch(async () => jsonResponse(429, { error: { message: "rate" } }));
    const retryable = await createGooglePeopleClient("access-token")
      .searchContacts("+919876543210")
      .catch((error: unknown) => error);
    expect(retryable).toBeInstanceOf(GooglePeopleApiError);
    expect(retryable).toMatchObject({ status: 429, retryable: true });

    stubFetch(async () => jsonResponse(409, { error: { message: "etag" } }));
    const concurrent = await createGooglePeopleClient("access-token")
      .updateContact({ resourceName: "people/dev", etag: "stale", names: [], phoneNumbers: [] })
      .catch((error: unknown) => error);
    expect(concurrent).toMatchObject({ status: 409 });

    stubFetch(async () => jsonResponse(401, { error: { message: "invalid" } }));
    const unauthorized = await createGooglePeopleClient("access-token")
      .createContact({ name: "Dev Jariwala", phone: "+919876543210" })
      .catch((error: unknown) => error);
    expect(unauthorized).toMatchObject({
      status: 401,
      retryable: false,
      message: "Google Contacts authorization is no longer valid",
    });
  });

  test("never issues a Google Contact delete", async () => {
    const fetchMock = mock(async (url: string, init?: RequestInit) => {
      expect(String(init?.method ?? "GET").toLowerCase()).not.toBe("delete");
      expect(url).not.toContain("deleteContact");
      return jsonResponse(200, {
        resourceName: "people/created",
        etag: "etag",
        names: [{ unstructuredName: "Dev Jariwala" }],
        phoneNumbers: [{ value: "+919876543210" }],
      });
    });
    stubFetch(fetchMock);

    await createGooglePeopleClient("access-token").createContact({
      name: "Dev Jariwala",
      phone: "+919876543210",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
