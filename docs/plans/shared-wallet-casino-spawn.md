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

- Offline daily expenses can legitimately make money negative. The money-delta server action now permits carrying debt; land and shop purchases still require funds. Added a server regression and regenerated server/dist/relay.mjs.
- The common-wallet acknowledgement also handles duplicate receipts that return no account snapshot. Reconnecting clears ephemeral property-action wait state.
- Deployment prerequisite: update EC2 relay before publishing the client so debt and new venue density calculations agree. scripts/update-relay-amazon-linux.sh downloads a pinned revision, checks syntax, backs up executable, restarts and health-checks with rollback; saved world and systemd configuration remain untouched. No SSH credentials are available to this agent. Keep PR #85 draft pending user execution on EC2.

- Final Chrome common-wallet test passed including negative offline balance (-100), recovery by earning income, interrupted acknowledgement, saved offline journal/reload and no duplicate migration.
- Updated two-player end-to-end regression passed: land purchase, owner-only free building, reconnect/undo, player-to-player sale, common money, persistence and backup.
- EC2 executable revision prepared and locally tested: a17fbd935fc59fb7571adfdcaec1681c2508a81c. Run the pinned update script on EC2; after health returns ok, verify CI, mark/merge PR #85 and verify Pages. Do not drop or reinitialize /var/lib/open-world/shared-world.json.

## Release checkpoint (2026-10-17 JST)
- Done: PR #85 merged as a71e38d270cd36e366e96da2d22201ef4cb5cd90 after CI run 39005423585 succeeded in all three jobs.
- User confirmed the EC2 update completed. Independent Chrome verification returned health=ok and a successful WSS connection.
- The EC2 executable was pinned to a17fbd935fc59fb7571adfdcaec1681c2508a81c (same runtime code as the merged release). Earlier draft/deployment hold notes above are resolved.
- GitHub Pages publication is being verified; no additional server changes are required for this release.

- Done: GitHub Pages deployment run 39021467469 succeeded. A fresh Chrome context with service workers blocked fetched the public site (HTTP 200), loaded assets/index-DvovbPU4.js and verified both new wallet and dispersed-shop code. Release is public at https://mamamaki12.github.io/open-world/ . All requested work in PR #85 is complete.
