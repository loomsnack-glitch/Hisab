# Label Templates issue drafts

Tickets published locally (GitHub `gh` is not available in this environment):

`.scratch/label-templates/issues/`

Canonical specs:

- [Phase 1](../../2026-08-13-label-templates-phase-1-spec.md)
- [Phase 2](../../2026-08-13-label-templates-phase-2-spec.md)
- [Phase 3](../../2026-08-13-label-templates-phase-3-spec.md)

## Publish order / frontier

1. `01` Template-shaped renderer — start immediately
2. `02` Saved Label Templates — blocked by 01
3. `03` Custom Label Stock and Keep-Outs — blocked by 02 (parallel with 04)
4. `04` Label Element composer — blocked by 02 (parallel with 03)
5. `05` Product Label Profile and Label Job fields — blocked by 04
6. `06` Visual designer — blocked by 05 (parallel with 07)
7. `07` TSPL adapter — blocked by 05 (parallel with 06)
8. `08` ZPL adapter — blocked by 07

Target label if later copied to GitHub: `ready-for-agent`
