# Google Contacts Synchronization uses a dedicated sync outbox

Google Contacts Synchronization will use its own persistent outbox and worker rather than sharing the WhatsApp worker. The integration has distinct authorization, contact matching, retry, and operational-status semantics, so an isolated delivery path keeps its failures and lifecycle from coupling to WhatsApp messaging while preserving asynchronous Customer writes.
