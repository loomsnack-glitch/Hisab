import { describe, expect, test } from "bun:test";
import { mapCloudTemplateSubmission } from "./cloud-template-submission.repository";

describe("Cloud template submission mapping", () => {
  test("maps a tenant-scoped pending submission without exposing secrets", () => {
    const submission = mapCloudTemplateSubmission({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      organization_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      whatsapp_business_account_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      originating_store_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      local_template_id: null,
      kind: "bill",
      friendly_name: "Bill receipt",
      meta_template_name: "bill_receipt",
      language_code: "en_US",
      category: "utility",
      requested_components: [{ type: "BODY", text: "Hello {{1}}" }],
      sample_values: { "1": "Asha" },
      idempotency_key: "bill-receipt-v1",
      meta_template_id: "123456789",
      status: "pending",
      rejection_reason: null,
      last_error_code: null,
      last_error_message: null,
      submitted_at: "2026-08-23T10:00:00.000Z",
      provider_updated_at: null,
      created_by: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      updated_by: null,
      created_at: "2026-08-23T09:00:00.000Z",
      updated_at: "2026-08-23T10:00:00.000Z",
    });

    expect(submission.status).toBe("pending");
    expect(submission.metaTemplateName).toBe("bill_receipt");
    expect(submission.sampleValues).toEqual({ "1": "Asha" });
    expect("accessToken" in submission).toBe(false);
  });
});
