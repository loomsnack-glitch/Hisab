# 03 — Automatic Customer change synchronization

**What to build:** Once initial sync is available, Customer creation and relevant Customer edits automatically synchronize in the background from both Ganatri Admin and Ganatri POS workflows, without delaying Customer creation, editing, or billing.

**Blocked by:** 02 — Initial Google Contacts catch-up sync.

**Status:** ready-for-agent

- [ ] Creating an eligible Customer through Ganatri Admin or Ganatri POS durably schedules synchronization while returning the normal successful Customer response without waiting for Google.
- [ ] Changing an eligible Customer's name or phone schedules a fresh sync that updates the linked Google Contact from Ganatri.
- [ ] Repeated/rapid Customer changes coalesce safely so older pending work cannot overwrite the latest Customer state.
- [ ] Removing a Customer phone number stops future synchronization and leaves the existing Google Contact unchanged.
- [ ] Service, route, and worker behavior tests prove that Google failures never block Customer or billing writes and that Admin/device-originated writes produce the same sync behavior.
