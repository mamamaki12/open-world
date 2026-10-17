# Shared wallet and casino spawn

- Branch: fix/shared-world-auto-doors
- Request: start shared play in front of the casino and carry money between offline and shared worlds.
- Decision: user selected the individual-world balance for the initial migration; do not add both balances. Cars, land and stocks remain world-specific.

## Approach
- Persist a common-wallet journal beside the personal profile. Reconcile acknowledged command IDs against server receipts before replaying durable offline deltas. Preserve pending changes across reconnect/reload.
- Keep server-side account changes (purchases, income) authoritative and apply pending personal deltas optimistically. Suppress feedback when applying account snapshots.
- Spawn at the casino after the first shared world snapshot; preserve the individual-world player position on return and do not teleport on reconnect.
- Verify migration, spending/earning in both directions, interrupted acknowledgements, reload, independent player balances and initial/reconnect positions.

## Progress
- Planned; automatic-door fix is implemented separately and undergoing browser verification.

- Implemented durable wallet deltas, receipt reconciliation, local money subscriptions, pending-payment exit guard and first-snapshot casino spawn/home-position restoration. Five pure wallet tests pass; browser reconnect/reload verification is running.

- Browser passed against a fresh Vite process: exact initial migration, shared spending carried home, offline income/spending synced, interrupted acknowledgement reconciled once, persisted pending payment survived reload, repeated entry did not duplicate money; casino spawn and no respawn on reconnect verified.
- Test note: restart Vite after source edits before using dynamic-import diagnostics; HMR URLs otherwise create separate store instances in probes.
