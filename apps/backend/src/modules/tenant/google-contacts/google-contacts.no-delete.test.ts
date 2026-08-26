import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Google Contacts no-deletion regression", () => {
  test("the Google People client and worker never issue a Contact delete", () => {
    const dir = import.meta.dir;
    const peopleClient = readFileSync(join(dir, "google-contacts.people-client.ts"), "utf8");
    const worker = readFileSync(join(dir, "google-contacts.worker.ts"), "utf8");
    const dispatcher = readFileSync(join(dir, "google-contacts.dispatcher.ts"), "utf8");
    const outbox = readFileSync(join(dir, "google-contacts.outbox.ts"), "utf8");
    const source = peopleClient + worker + dispatcher + outbox;

    expect(source).not.toContain("people.deleteContact");
    expect(source).not.toContain(":deleteContact");
    expect(source).not.toContain("deleteContact(");
    expect(source.toLowerCase()).not.toContain("method: \"delete\"");
    expect(source).not.toContain("whatsapp");
  });

  test("disconnect and replacement stop local work without deleting Google Contacts", () => {
    const dir = import.meta.dir;
    const repository = readFileSync(join(dir, "google-contacts.repository.ts"), "utf8");
    const service = readFileSync(join(dir, "google-contacts.service.ts"), "utf8");
    const oauth = readFileSync(join(dir, "google-contacts.oauth.ts"), "utf8");
    const dispatcher = readFileSync(join(dir, "google-contacts.dispatcher.ts"), "utf8");
    const source = repository + service + oauth + dispatcher;

    expect(repository).toContain("DELETE FROM google_contacts_sync_outbox");
    expect(repository).toContain("DELETE FROM google_contacts_customer_links");
    expect(repository).toContain("DELETE FROM google_contacts_connections");
    expect(repository).toContain("resetDestination");
    expect(oauth).toContain("oauth2.googleapis.com/revoke");
    expect(dispatcher).toContain("isConnectionUsable");
    expect(service).toContain("resetDestination");
    expect(source).not.toContain("people.deleteContact");
    expect(source).not.toContain("deleteContact(");
    expect(source.toLowerCase()).not.toContain("people:deletecontact");
  });

  test("conflict, recreate, reconnect, and failed delivery paths still never delete a Google Contact", () => {
    const dir = import.meta.dir;
    const worker = readFileSync(join(dir, "google-contacts.worker.ts"), "utf8");
    const dispatcher = readFileSync(join(dir, "google-contacts.dispatcher.ts"), "utf8");
    const outbox = readFileSync(join(dir, "google-contacts.outbox.ts"), "utf8");
    const peopleClient = readFileSync(join(dir, "google-contacts.people-client.ts"), "utf8");
    const source = worker + dispatcher + outbox + peopleClient;

    expect(worker).toContain('reason: "phone_collision"');
    expect(worker).toContain("status === 404");
    expect(outbox).toContain("status = 'reconnect_required'");
    expect(outbox).toContain("lease_expires_at IS NULL OR lease_expires_at < NOW()");
    expect(peopleClient).toContain('updatePersonFields", UPDATE_PERSON_FIELDS');
    expect(source.toLowerCase()).not.toContain("method: \"delete\"");
    expect(source).not.toContain("deleteContact(");
  });
});
