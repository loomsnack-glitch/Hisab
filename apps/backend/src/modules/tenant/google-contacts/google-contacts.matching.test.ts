import { describe, expect, test } from "bun:test";
import {
  exactGoogleContactMatches,
  googleContactHasExactPhone,
  otherExactGoogleContactMatches,
  withGanatriNameAndMatchingPhone,
} from "./google-contacts.matching";
import type { GoogleContactPerson } from "./google-contacts.people";

const person = (
  resourceName: string,
  phones: Array<{ value?: string; canonicalForm?: string; type?: string }>,
  name = "Dev",
): GoogleContactPerson => ({
  resourceName,
  etag: `${resourceName}-etag`,
  names: [{ unstructuredName: name, givenName: name }],
  phoneNumbers: phones,
});

describe("Google Contact Match", () => {
  test("accepts an exact normalized phone even when Google used a different format", () => {
    const contact = person("people/1", [
      { value: "098765 43210", canonicalForm: "+919876543210" },
    ]);

    expect(googleContactHasExactPhone(contact, "+919876543210")).toBe(true);
    expect(exactGoogleContactMatches([contact], "+919876543210")).toEqual([contact]);
  });

  test("rejects prefix-similar Google search hits that are not exactly equal", () => {
    const prefixHit = person("people/prefix", [
      { value: "+9198765432109", canonicalForm: "+9198765432109" },
    ]);

    expect(googleContactHasExactPhone(prefixHit, "+919876543210")).toBe(false);
    expect(exactGoogleContactMatches([prefixHit], "+919876543210")).toEqual([]);
  });

  test("does not match by name when the phone numbers differ", () => {
    const sameName = person("people/name", [{ value: "+911234567890" }], "Dev Jariwala");

    expect(exactGoogleContactMatches([sameName], "+919876543210")).toEqual([]);
  });

  test("matches Dev when the Customer phone is exact even if the Google name differs", () => {
    const googleDev = person("people/dev", [{ value: "+919876543210" }], "Dev");

    expect(exactGoogleContactMatches([googleDev], "+919876543210")).toEqual([googleDev]);
  });

  test("updates only the matching phone entry and the name from Ganatri", () => {
    const contact = person(
      "people/multi",
      [
        { value: "+14155552671", type: "work" },
        { value: "98765 43210", canonicalForm: "+919876543210" },
        { value: "+442079460958" },
      ],
      "Dev",
    );

    const updated = withGanatriNameAndMatchingPhone(contact, "Dev Jariwala", "+919876543210");

    expect(updated.names).toEqual([
      { unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" },
    ]);
    expect(updated.phoneNumbers).toEqual([
      { value: "+14155552671", type: "work" },
      { value: "+919876543210", canonicalForm: "+919876543210" },
      { value: "+442079460958" },
    ]);
    expect(updated.resourceName).toBe("people/multi");
    expect(updated.etag).toBe("people/multi-etag");
  });

  test("replaces the previously matched phone when the Customer phone changes", () => {
    const contact = person(
      "people/changed",
      [
        { value: "+14155552671", type: "work" },
        { value: "+919876543210", canonicalForm: "+919876543210" },
      ],
      "Dev",
    );

    const updated = withGanatriNameAndMatchingPhone(
      contact,
      "Dev Jariwala",
      "+918888888888",
      "+919876543210",
    );

    expect(updated.names).toEqual([
      { unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" },
    ]);
    expect(updated.phoneNumbers).toEqual([
      { value: "+14155552671", type: "work" },
      { value: "+918888888888", canonicalForm: "+918888888888" },
    ]);
  });

  test("preserves extra phone numbers and every unrelated Google field", () => {
    const contact: GoogleContactPerson = {
      ...person(
        "people/rich",
        [
          { value: "+14155552671", type: "work" },
          { value: "+919876543210", canonicalForm: "+919876543210" },
          { value: "+442079460958", type: "mobile" },
        ],
        "Dev",
      ),
      emailAddresses: [{ value: "dev@example.com", type: "home" }],
      addresses: [{ formattedValue: "1 Market St", type: "work" }],
      biographies: [{ value: "Staff-maintained notes", contentType: "TEXT_PLAIN" }],
      photos: [{ url: "https://example.com/photo.jpg", default: false }],
      memberships: [{ contactGroupMembership: { contactGroupResourceName: "contactGroups/friends" } }],
      organizations: [{ name: "Loomsnack", title: "Owner" }],
      metadata: { sources: [{ etag: "people/rich-etag", type: "CONTACT" }] },
    };

    const updated = withGanatriNameAndMatchingPhone(contact, "Dev Jariwala", "+919876543210");

    expect(updated.names).toEqual([
      { unstructuredName: "Dev Jariwala", givenName: "Dev Jariwala" },
    ]);
    expect(updated.phoneNumbers).toEqual([
      { value: "+14155552671", type: "work" },
      { value: "+919876543210", canonicalForm: "+919876543210" },
      { value: "+442079460958", type: "mobile" },
    ]);
    expect(updated.emailAddresses).toEqual([{ value: "dev@example.com", type: "home" }]);
    expect(updated.addresses).toEqual([{ formattedValue: "1 Market St", type: "work" }]);
    expect(updated.biographies).toEqual([
      { value: "Staff-maintained notes", contentType: "TEXT_PLAIN" },
    ]);
    expect(updated.photos).toEqual([{ url: "https://example.com/photo.jpg", default: false }]);
    expect(updated.memberships).toEqual([
      { contactGroupMembership: { contactGroupResourceName: "contactGroups/friends" } },
    ]);
    expect(updated.organizations).toEqual([{ name: "Loomsnack", title: "Owner" }]);
    expect(updated.metadata).toEqual({ sources: [{ etag: "people/rich-etag", type: "CONTACT" }] });
    expect(updated.etag).toBe("people/rich-etag");
  });

  test("treats another exact phone match as a collision with the linked Google Contact", () => {
    const linked = person("people/linked", [{ value: "+919876543210" }]);
    const other = person("people/other", [{ canonicalForm: "+918888888888" }]);

    expect(
      otherExactGoogleContactMatches([linked, other], "+918888888888", "people/linked"),
    ).toEqual([other]);
    expect(
      otherExactGoogleContactMatches([linked], "+918888888888", "people/linked"),
    ).toEqual([]);
  });
});
