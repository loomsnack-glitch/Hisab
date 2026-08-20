# Platform Operations Console uses separate Owner User authentication

Platform Operations Console authentication is backed by a dedicated `owner_users` identity store rather than customer `users`, despite sharing the same WhatsApp/password login capabilities. This preserves a hard boundary between Ganatri's cross-organization access and Organization administration; only active Owner Users may access the console, and deactivation takes effect on the next authenticated request.
