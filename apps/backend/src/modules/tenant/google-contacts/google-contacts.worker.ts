import { normalizePhoneNumber } from "@repo/types";
import {
  exactGoogleContactMatches,
  withGanatriNameAndMatchingPhone,
} from "./google-contacts.matching";
import type { GooglePeopleClient } from "./google-contacts.people";
import { GooglePeopleApiError } from "./google-contacts.people-client";

export type GoogleContactsSyncJob = {
  outboxId: string;
  organizationId: string;
  connectionId: string;
  customerId: string;
  connectionStatus: "connected" | "connecting" | "reconnect_required" | "disconnected";
  customerName: string;
  customerPhone: string | null;
  linkedGoogleResourceName: string | null;
};

export type GoogleContactsSyncOutcome =
  | { status: "created"; googleResourceName: string }
  | { status: "updated"; googleResourceName: string }
  | { status: "skipped"; reason: "ineligible" | "connection_inactive" }
  | { status: "conflict"; reason: "multiple_matches" }
  | { status: "retryable"; code: string; message: string }
  | { status: "failed"; code: string; message: string };

const searchQueries = (normalizedPhone: string): string[] => {
  const digits = normalizedPhone.replace(/\D/g, "");
  return Array.from(new Set([normalizedPhone, digits].filter(Boolean)));
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

  try {
    const candidates: Awaited<ReturnType<GooglePeopleClient["searchContacts"]>> = [];
    const seen = new Set<string>();
    for (const query of searchQueries(normalizedPhone)) {
      for (const candidate of await people.searchContacts(query)) {
        if (seen.has(candidate.resourceName)) continue;
        seen.add(candidate.resourceName);
        candidates.push(candidate);
      }
    }

    const matches = exactGoogleContactMatches(candidates, normalizedPhone);
    if (matches.length > 1) {
      return { status: "conflict", reason: "multiple_matches" };
    }

    if (matches.length === 1) {
      const matched = matches[0]!;
      const updated = await people.updateContact(
        withGanatriNameAndMatchingPhone(matched, job.customerName.trim(), normalizedPhone),
      );
      return { status: "updated", googleResourceName: updated.resourceName };
    }

    const created = await people.createContact({
      name: job.customerName.trim(),
      phone: normalizedPhone,
    });
    return { status: "created", googleResourceName: created.resourceName };
  } catch (error) {
    if (error instanceof GooglePeopleApiError) {
      return error.retryable
        ? { status: "retryable", code: "google_unavailable", message: error.message }
        : { status: "failed", code: "google_write_failed", message: error.message };
    }
    const message = error instanceof Error ? error.message : "Google Contacts synchronization failed";
    const retryable = /temporar|timeout|rate|unavailable|network|429|5\d\d/i.test(message);
    return retryable
      ? { status: "retryable", code: "google_unavailable", message: "Google Contacts is temporarily unavailable" }
      : { status: "failed", code: "google_write_failed", message: "Google Contacts could not be updated" };
  }
};
