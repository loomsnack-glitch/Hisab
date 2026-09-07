# 08 — Enforce Admin operational Features

**What to build:** Organization and Store operations in Ganatri Admin require the Store's server-side Feature Entitlement for catalog products, units, vendors, purchases, expenses, and money-account tracking. Shared Organization setup remains shared while each Store's use is commercially controlled.

**Blocked by:** 02 — Legacy Store migration grants.

**Status:** ready-for-agent

- [ ] Requests that create, change, or use each covered workflow are forbidden at the server when the Store lacks its matching Feature Entitlement.
- [ ] Valid entitlement preserves existing behavior, while money-account tracking also continues to require its existing Store operational configuration.
- [ ] Access-denied responses are stable and actionable without leaking other Organizations' commercial or payment data.
- [ ] Service and route behavior tests cover entitled and unentitled Stores sharing one Organization's business data, including migration-grant access and post-expiry denial.
