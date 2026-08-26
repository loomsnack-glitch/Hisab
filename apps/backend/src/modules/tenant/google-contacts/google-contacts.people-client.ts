import type {
  GoogleContactPerson,
  GooglePeopleClient,
} from "./google-contacts.people";

const PEOPLE_API_BASE = "https://people.googleapis.com/v1";
const SEARCH_READ_MASK = "names,phoneNumbers,metadata";
const CONTACT_READ_MASK =
  "names,phoneNumbers,emailAddresses,addresses,biographies,photos,memberships,organizations,urls,metadata";
const UPDATE_PERSON_FIELDS = "names,phoneNumbers";
const GOOGLE_PEOPLE_REQUEST_TIMEOUT_MS = 15_000;

export class GooglePeopleApiError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GooglePeopleApiError";
    this.status = status;
    this.retryable = status === 409 || status === 429 || status >= 500;
  }
}

const extraPersonFields = [
  "emailAddresses",
  "addresses",
  "biographies",
  "photos",
  "memberships",
  "organizations",
  "urls",
  "metadata",
] as const;

const asPerson = (value: unknown): GoogleContactPerson | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const resourceName =
    typeof record.resourceName === "string" ? record.resourceName.trim() : "";
  if (!resourceName) return null;
  const person: GoogleContactPerson = {
    resourceName,
    etag: typeof record.etag === "string" ? record.etag : undefined,
    names: Array.isArray(record.names) ? record.names as GoogleContactPerson["names"] : undefined,
    phoneNumbers: Array.isArray(record.phoneNumbers)
      ? record.phoneNumbers as GoogleContactPerson["phoneNumbers"]
      : undefined,
  };
  for (const field of extraPersonFields) {
    if (field in record) {
      person[field] = record[field];
    }
  }
  return person;
};

const messageForStatus = (status: number): string => {
  if (status === 401 || status === 403) {
    return "Google Contacts authorization is no longer valid";
  }
  if (status === 404) return "Google Contact was not found";
  if (status === 409) return "Google Contact was modified";
  if (status === 429 || status >= 500) {
    return "Google Contacts is temporarily unavailable";
  }
  return "Google Contacts could not be updated";
};

const requestJson = async (
  accessToken: string,
  url: string,
  init: RequestInit = {},
): Promise<unknown> => {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: init.signal ?? AbortSignal.timeout(GOOGLE_PEOPLE_REQUEST_TIMEOUT_MS),
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new GooglePeopleApiError(503, "Google Contacts is temporarily unavailable");
  }
  if (response.status === 204) return null;
  if (!response.ok) {
    throw new GooglePeopleApiError(response.status, messageForStatus(response.status));
  }
  try {
    return await response.json();
  } catch {
    throw new GooglePeopleApiError(502, "Google Contacts is temporarily unavailable");
  }
};

export const createGooglePeopleClient = (accessToken: string): GooglePeopleClient => ({
  searchContacts: async (query) => {
    const url = new URL(`${PEOPLE_API_BASE}/people:searchContacts`);
    url.searchParams.set("query", query);
    url.searchParams.set("readMask", SEARCH_READ_MASK);
    const payload = await requestJson(accessToken, url.toString());
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
    const results = (payload as { results?: unknown }).results;
    if (!Array.isArray(results)) return [];
    const people: GoogleContactPerson[] = [];
    for (const result of results) {
      const person = asPerson(
        result && typeof result === "object" && !Array.isArray(result)
          ? (result as { person?: unknown }).person ?? result
          : result,
      );
      if (person) people.push(person);
    }
    return people;
  },
  createContact: async (input) => {
    const payload = await requestJson(accessToken, `${PEOPLE_API_BASE}/people:createContact`, {
      method: "POST",
      body: JSON.stringify({
        names: [{ unstructuredName: input.name, givenName: input.name }],
        phoneNumbers: [{ value: input.phone }],
      }),
    });
    const person = asPerson(payload);
    if (!person) {
      throw new GooglePeopleApiError(502, "Google Contacts could not be updated");
    }
    return person;
  },
  updateContact: async (person) => {
    const url = new URL(`${PEOPLE_API_BASE}/${person.resourceName}:updateContact`);
    url.searchParams.set("updatePersonFields", UPDATE_PERSON_FIELDS);
    const payload = await requestJson(accessToken, url.toString(), {
      method: "PATCH",
      body: JSON.stringify({
        resourceName: person.resourceName,
        etag: person.etag,
        names: person.names,
        phoneNumbers: person.phoneNumbers,
      }),
    });
    return asPerson(payload) ?? person;
  },
  getContact: async (resourceName) => {
    const url = new URL(`${PEOPLE_API_BASE}/${resourceName}`);
    url.searchParams.set("personFields", CONTACT_READ_MASK);
    const payload = await requestJson(accessToken, url.toString());
    const person = asPerson(payload);
    if (!person) {
      throw new GooglePeopleApiError(502, "Google Contacts could not be updated");
    }
    return person;
  },
});
