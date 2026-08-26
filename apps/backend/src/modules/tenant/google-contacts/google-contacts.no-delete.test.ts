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
});
