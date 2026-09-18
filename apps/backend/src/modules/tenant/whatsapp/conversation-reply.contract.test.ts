import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const conversationSource = readFileSync(new URL("./conversation.ts", import.meta.url), "utf8");
const repositorySource = readFileSync(new URL("./whatsapp.repository.ts", import.meta.url), "utf8");
const outboxSource = readFileSync(new URL("./cloud-api/cloud-outbox.repository.ts", import.meta.url), "utf8");
const dispatcherSource = readFileSync(new URL("./cloud-api/cloud-dispatcher.ts", import.meta.url), "utf8");

describe("Organization Cloud conversation reply boundary", () => {
    test("queues replies through the current Cloud conversation scope with idempotency", () => {
        expect(conversationSource).toContain("repository.queueConversationReply");
        expect(conversationSource).toContain("scope.account.provider !== \"cloud_api\"");
        expect(conversationSource).toContain("data.requestId ?? randomUUID()");
        expect(repositorySource).toContain("policy.mode = 'organization_cloud'");
        expect(repositorySource).toContain("conversation.whatsapp_account_id = ${params.accountId}");
        expect(repositorySource).toContain("admitCloudConversationReply");
        expect(repositorySource).toContain("message.idempotency_key = ${params.idempotencyKey}");
        expect(repositorySource).toContain("conversation.customer_id IS NULL");
        expect(repositorySource).toContain("regexp_replace(COALESCE(customer.phone, ''), '[^0-9]', '', 'g') = regexp_replace(conversation.contact_phone_number, '[^0-9]', '', 'g')");
        expect(repositorySource.indexOf("const [existing] = await tx`"))
            .toBeLessThan(repositorySource.indexOf("const [scope] = await tx`"));
    });

    test("persists text replies as durable Cloud outbox work and dispatches them", () => {
        expect(repositorySource).toContain("'outbound', 'text', ${params.body}, 'queued'");
        expect(repositorySource).toContain("'conversation_reply', 'pending'");
        expect(outboxSource).toContain("outbox.kind IN ('template', 'conversation_reply')");
        expect(dispatcherSource).toContain("if (job.messageType === \"text\")");
    });
});
