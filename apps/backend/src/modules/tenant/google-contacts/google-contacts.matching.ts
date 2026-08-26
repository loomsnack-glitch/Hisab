import { normalizePhoneNumber } from "@repo/types";
import type { GoogleContactPerson, GoogleContactPhone } from "./google-contacts.people";

const phoneValues = (entry: GoogleContactPhone): string[] =>
  [entry.canonicalForm, entry.value].filter((value): value is string => Boolean(value?.trim()));

export const googleContactHasExactPhone = (
  person: GoogleContactPerson,
  normalizedPhone: string,
): boolean =>
  (person.phoneNumbers ?? []).some((entry) =>
    phoneValues(entry).some((value) => normalizePhoneNumber(value) === normalizedPhone),
  );

export const exactGoogleContactMatches = (
  candidates: GoogleContactPerson[],
  normalizedPhone: string,
): GoogleContactPerson[] => {
  const seen = new Set<string>();
  const matches: GoogleContactPerson[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.resourceName) || !googleContactHasExactPhone(candidate, normalizedPhone)) {
      continue;
    }
    seen.add(candidate.resourceName);
    matches.push(candidate);
  }
  return matches;
};

export const withGanatriNameAndMatchingPhone = (
  person: GoogleContactPerson,
  name: string,
  normalizedPhone: string,
  previousNormalizedPhone?: string | null,
): GoogleContactPerson => {
  const replacePhones = Array.from(
    new Set(
      [previousNormalizedPhone, normalizedPhone].filter((value): value is string => Boolean(value?.trim())),
    ),
  );
  let replaced = false;
  const phoneNumbers = (person.phoneNumbers ?? []).map((entry) => {
    if (replaced) return entry;
    if (
      !phoneValues(entry).some((value) => {
        const normalized = normalizePhoneNumber(value);
        return normalized !== null && replacePhones.includes(normalized);
      })
    ) {
      return entry;
    }
    replaced = true;
    return {
      ...entry,
      value: normalizedPhone,
      canonicalForm: entry.canonicalForm ? normalizedPhone : entry.canonicalForm,
    };
  });

  return {
    ...person,
    names: [{ unstructuredName: name, givenName: name }],
    phoneNumbers: replaced ? phoneNumbers : [...phoneNumbers, { value: normalizedPhone }],
  };
};
