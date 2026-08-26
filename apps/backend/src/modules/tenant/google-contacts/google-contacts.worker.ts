import { normalizePhoneNumber } from "@repo/types";
import {
  exactGoogleContactMatches,
  otherExactGoogleContactMatches,
  withGanatriNameAndMatchingPhone,
} from "./google-contacts.matching";
import type { GoogleContactPerson, GooglePeopleClient } from "./google-contacts.people";
import { GooglePeopleApiError } from "./google-contacts.people-client";

export type GoogleContactsSyncJob = {
  outboxId: string;
  organizationId: string;
  connectionId: string;
  customerId: string;
  connectionStatus: "connected" | "connecting" | "reconnect_required" | "disconnected";
  customerName: string;
  customerPhone: string | null;
  customerUpdatedAt: string;
  linkedGoogleResourceName: string | null;
  matchedPhone: string | null;
};

export type GoogleContactsSyncOutcome =
  | { status: "created"; googleResourceName: string }
  | { status: "updated"; googleResourceName: string }
  | { status: "skipped"; reason: "ineligible" | "connection_inactive" }
  | { status: "conflict"; reason: "multiple_matches" | "phone_collision" }
  | { status: "retryable"; code: string; message: string }
  | { status: "reconnect_required"; code: string; message: string }
  | { status: "failed"; code: string; message: string };

const CONCURRENT_EDIT_ATTEMPTS = 3;

const searchQueries = (normalizedPhone: string): string[] => {
  const digits = normalizedPhone.replace(/\D/g, "");
  return Array.from(new Set([normalizedPhone, digits].filter(Boolean)));
};

const collectExactMatchCandidates = async (
  people: GooglePeopleClient,
  normalizedPhone: string,
): Promise<GoogleContactPerson[]> => {
  const candidates: GoogleContactPerson[] = [];
  const seen = new Set<string>();
  for (const query of searchQueries(normalizedPhone)) {
    for (const candidate of await people.searchContacts(query)) {
      if (seen.has(candidate.resourceName)) continue;
      seen.add(candidate.resourceName);
      candidates.push(candidate);
    }
  }
  return candidates;
};

const isMissingLinkedContact = (error: unknown): boolean =>
  error instanceof GooglePeopleApiError && error.status === 404;

const isConcurrentGoogleEdit = (error: unknown): boolean =>
  error instanceof GooglePeopleApiError && error.status === 409;

const updateFromCurrentGoogleMetadata = async (
  people: GooglePeopleClient,
  resourceName: string,
  customerName: string,
  normalizedPhone: string,
  matchedPhone: string | null,
): Promise<GoogleContactPerson> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= CONCURRENT_EDIT_ATTEMPTS; attempt++) {
    const current = await people.getContact(resourceName);
    try {
      return await people.updateContact(
        withGanatriNameAndMatchingPhone(
          current,
          customerName,
          normalizedPhone,
          matchedPhone,
        ),
      );
    } catch (error) {
      lastError = error;
      if (isConcurrentGoogleEdit(error) && attempt < CONCURRENT_EDIT_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const classifyGoogleFailure = (error: unknown): GoogleContactsSyncOutcome => {
  if (error instanceof GooglePeopleApiError) {
    if (error.status === 401 || error.status === 403) {
      return {
        status: "reconnect_required",
        code: "google_reconnect_required",
        message: error.message,
      };
    }
    if (error.retryable || error.status === 409) {
      return { status: "retryable", code: "google_unavailable", message: error.message };
    }
    return { status: "failed", code: "google_write_failed", message: error.message };
  }
  const message = error instanceof Error ? error.message : "Google Contacts synchronization failed";
  const retryable = /temporar|timeout|rate|unavailable|network|429|5\d\d/i.test(message);
  return retryable
    ? { status: "retryable", code: "google_unavailable", message: "Google Contacts is temporarily unavailable" }
    : { status: "failed", code: "google_write_failed", message: "Google Contacts could not be updated" };
};

export const processGoogleContactsSyncJob = async (
  job: GoogleContactsSyncJob,
  people: GooglePeopleClient,
): Promise<GoogleContactsSyncOutcome> => {
  if (job.connectionStatus !== "connected") {
    return { status: "skipped", reason: "connection_inactive" };
  }

  const normalizedPhone = normalizePhoneNumber(job.customerPhone);
  if (!normalizedPhone) {
    return { status: "skipped", reason: "ineligible" };
  }

  const customerName = job.customerName.trim();
  const previousPhone = job.matchedPhone ?? null;
  const phoneChanged =
    Boolean(previousPhone) && normalizePhoneNumber(previousPhone) !== normalizedPhone;

  try {
    if (job.linkedGoogleResourceName && phoneChanged) {
      const collisions = otherExactGoogleContactMatches(
        await collectExactMatchCandidates(people, normalizedPhone),
        normalizedPhone,
        job.linkedGoogleResourceName,
      );
      if (collisions.length > 0) {
        return { status: "conflict", reason: "phone_collision" };
      }
    }

    if (job.linkedGoogleResourceName) {
      try {
        const updated = await updateFromCurrentGoogleMetadata(
          people,
          job.linkedGoogleResourceName,
          customerName,
          normalizedPhone,
          previousPhone,
        );
        return { status: "updated", googleResourceName: updated.resourceName };
      } catch (error) {
        if (!isMissingLinkedContact(error)) {
          throw error;
        }
      }
    }

    const matches = exactGoogleContactMatches(
      await collectExactMatchCandidates(people, normalizedPhone),
      normalizedPhone,
    );
    if (matches.length > 1) {
      return { status: "conflict", reason: "multiple_matches" };
    }

    if (matches.length === 1) {
      const matched = matches[0]!;
      try {
        const updated = await updateFromCurrentGoogleMetadata(
          people,
          matched.resourceName,
          customerName,
          normalizedPhone,
          previousPhone,
        );
        return { status: "updated", googleResourceName: updated.resourceName };
      } catch (error) {
        if (!isMissingLinkedContact(error)) {
          throw error;
        }
      }
    }

    const created = await people.createContact({
      name: customerName,
      phone: normalizedPhone,
    });
    return { status: "created", googleResourceName: created.resourceName };
  } catch (error) {
    return classifyGoogleFailure(error);
  }
};
