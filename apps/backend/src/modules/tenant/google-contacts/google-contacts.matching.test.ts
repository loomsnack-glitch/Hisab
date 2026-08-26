import { describe, expect, test } from "bun:test";
import {
  exactGoogleContactMatches,
  googleContactHasExactPhone,
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
});
