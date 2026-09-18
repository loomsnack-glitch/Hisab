import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const conversationSource = readFileSync(new URL("./conversation.ts", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("./whatsapp.repository.ts", import.meta.url), "utf8");

describe("Organization Cloud conversation customer and attachment boundary", () => {
    test("records exact conversation matches in the Customer Store activity ledger", () => {
        expect(repositorySource).toContain("source: \"whatsapp_conversation\"");
        expect(repositorySource).toContain("sourceReference: params.providerMessageId");
        expect(repositorySource).toContain("recordCustomerStoreActivityInDatabase(tx");
    });

    test("requires an exact phone match before explicit attachment and records its actor", () => {
        expect(repositorySource).toContain("regexp_replace(COALESCE(customer.phone, ''), '[^0-9]', '', 'g') = regexp_replace(conversation.contact_phone_number, '[^0-9]', '', 'g')");
        expect(repositorySource).toContain("source: \"explicit_attachment\"");
        expect(repositorySource).toContain("sourceReference: conversationId");
        expect(repositorySource).toContain("createdBy,");
    });

    test("keeps attachment access private, scoped, and short-lived", () => {
        expect(conversationSource).toContain("getMessageAttachmentKey(organizationId, storeId, scoped.data.account.id, conversationId, messageId)");
        expect(conversationSource).toContain("const SIGNED_URL_SECONDS = 300");
        expect(conversationSource).toContain("Private media storage is not configured");
        expect(conversationSource).toContain("generateSignedUrlBeta(bucket, attachment.key, SIGNED_URL_SECONDS, attachment.fileName)");
        expect(repositorySource).toContain("AND conversation_id = ${conversationId}");
        expect(repositorySource).toContain("AND organization_id = ${organizationId}");
        expect(repositorySource).toContain("AND store_id = ${storeId}");
        expect(repositorySource).toContain("AND whatsapp_account_id = ${accountId}");
    });
});
