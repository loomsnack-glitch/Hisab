## Agent skills

### Issue tracker

Issues and specs are tracked as local Markdown files. See `docs/agents/issue-tracker.md`.

### Triage labels

The repository uses the default engineering-skill triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

The repository has a single shared domain context. See `docs/agents/domain.md`.

### Validation safety

Do not run build commands, Android/emulator commands, or device-start commands
while any planned POS mobile phase remains incomplete. The user will run those
checks after all phases are finished. During phase work, use lightweight
read-only review and focused unit/type validation only when explicitly useful.
