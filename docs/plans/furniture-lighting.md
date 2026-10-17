# Furniture lighting

- Branch: feat/furniture-lighting (mamamaki12/open-world)
- Request: add wall-mounted electric lights and ground/floor indirect lighting to Furniture.

## Approach
- Add a Lighting group to Furniture with wall sconce, wall bar, low indirect lamp and garden bollard; make the existing floor lamp emit warm light too.
- Generalize the existing nameplate wall mounting path for lighting, including desktop, touch and walking aim placement, opening avoidance, preview, movement and removal. Preserve existing nameplates and saved mount format.
- Support floor/ground placement using existing furnitureBaseY rules. Add emissive surfaces and a globally capped pool of nearby shadow-free lights (desktop 6, mobile 3), so many lamps do not create unbounded GPU work. Preview lights must not illuminate the scene.
- Verify wall sides/openings/upper floors, save/shared validation, light budget and browser placement/night rendering. Regenerate bundled relay when catalog changes; check compatibility before publishing.

## Progress
- Reviewed latest main 5739d9f, no open PRs. Existing floor-lamp is decorative only; wall mounting is currently hard-coded to nameplates. Planning complete, implementation next.

- Implemented five lighting entries, generic wall mount placement/preview/aim/touch controls, type-compatible inspector replacement, emissive diffuser materials and global 6/3 light pool. Existing nameplate transform remains backward compatible; raised wall fixtures no longer create phantom floor collision columns.
- Build and existing 633 tests passed; 12 targeted mounting/light-budget/material tests passed. Browser placement and night rendering next.
- Compatibility: new fixture appraisal prices are explicitly 50000 yen, equal to the already deployed relay fallback. Existing money/build protocols and saved fields are unchanged; verify new placements against the captured deployed relay before requiring any EC2 update.

- Chrome desktop and portrait phone checks passed: Lighting group visible on desktop, real wall click / mobile walking-aim placement, preview emits no scene light, 5cm height adjustment, real floor placement, global 6/3 shadow-free budget, night screenshots, backup/import and wall-deletion light cleanup.
- Visual review confirms soft warm pools on the wall and floor. Files: browser-checks/furniture-lighting-desktop-night.png and phone-night.png (ignored test evidence).
- Legacy deployed relay compatibility passed using captured pre-light bundle: all 4 new fixture types and mount metadata are persisted and duplicate receipts are idempotent. Current rebuilt bundle passed the same check. EC2 update is not required for this feature.
- All 633 existing tests and build passed; 43 targeted tests including 9 new mounting/light/material regressions passed. CI and release next.

- PR #86. First CI run 39022562238 passed full units/build, building-detail and world-session, but the new lighting browser check sampled light-pool intensity before a slow software-rendered frame updated. Replaced the fixed 1s wait with polling for actual active lights and added light diagnostics. Lighting browser checks now have a dedicated CI job/artifact, separate from unrelated controls. Revalidation in progress.
