# 07 — Move the POS WhatsApp workflow

**What to build:** Make the device-scoped POS WhatsApp inbox and related messaging behavior available from Ganatri POS `/whatsapp`, without affecting Organization-administrator WhatsApp configuration in Ganatri Admin.

**Blocked by:** 02 — Create the standalone Ganatri POS core.

**Status:** ready-for-agent

- [ ] An authenticated Store Device can open POS `/whatsapp` and use the existing device-scoped conversation and attachment behavior.
- [ ] Sending a message and attaching a customer preserve the current validation, loading, and delivery-status behavior.
- [ ] POS bill and due-reminder WhatsApp actions remain available from their relevant POS workflows.
- [ ] Ganatri Admin retains Organization-admin WhatsApp accounts, templates, links, and configuration without embedding the POS inbox.

