# Furniture lighting

## 現在の状態

- 状態: 完了
- PR: [#86](https://github.com/mamamaki12/open-world/pull/86)（マージ済み）
- 公開: [Pages成功・公開版確認](extended-gameplay-audit.md#公開完了2026-10-20)（2026-10-20、`7f68760`）。
- 残作業: なし（このplanの依頼範囲）。
- 将来の拡張・追加確認: なし。
- 確認根拠: #86: 725073c。
- 最終更新: 2026-10-20

## 経過記録（過去の方針・進捗）

> 現在の判断には上の「現在の状態」を使用する。以下の「次」「未完」「課題」は当時の記録であり、現在の残作業一覧ではない。

- Branch: feat/furniture-lighting (mamamaki12/open-world)
- PR: #86
- Request: add wall-mounted electric lights and ground/floor indirect lighting to Furniture.

### Approach
- Add a Lighting group to Furniture with wall sconce, wall bar, low indirect lamp and garden bollard; make the existing floor lamp emit warm light too.
- Generalize the existing nameplate wall mounting path for lighting, including desktop, touch and walking aim placement, opening avoidance, preview, movement and removal. Preserve existing nameplates and saved mount format.
- Support floor/ground placement using existing furnitureBaseY rules. Add emissive surfaces and a globally capped pool of nearby shadow-free lights (desktop 6, mobile 3), so many lamps do not create unbounded GPU work. Preview lights must not illuminate the scene.
- Verify wall sides/openings/upper floors, save/shared validation, light budget and browser placement/night rendering. Regenerate bundled relay when catalog changes; check compatibility before publishing.

### Progress
- Reviewed latest main 5739d9f, no open PRs. Existing floor-lamp is decorative only; wall mounting is currently hard-coded to nameplates. Planning complete, implementation next.

- Implemented five lighting entries, generic wall mount placement/preview/aim/touch controls, type-compatible inspector replacement, emissive diffuser materials and global 6/3 light pool. Existing nameplate transform remains backward compatible; raised wall fixtures no longer create phantom floor collision columns.
- Build and existing 633 tests passed; 12 targeted mounting/light-budget/material tests passed. Browser placement and night rendering next.
- Compatibility: new fixture appraisal prices are explicitly 50000 yen, equal to the already deployed relay fallback. Existing money/build protocols and saved fields are unchanged; verify new placements against the captured deployed relay before requiring any EC2 update.

- Chrome desktop and portrait phone checks passed: Lighting group visible on desktop, real wall click / mobile walking-aim placement, preview emits no scene light, 5cm height adjustment, real floor placement, global 6/3 shadow-free budget, night screenshots, backup/import and wall-deletion light cleanup.
- Visual review confirms soft warm pools on the wall and floor. Files: browser-checks/furniture-lighting-desktop-night.png and phone-night.png (ignored test evidence).
- Legacy deployed relay compatibility passed using captured pre-light bundle: all 4 new fixture types and mount metadata are persisted and duplicate receipts are idempotent. Current rebuilt bundle passed the same check. EC2 update is not required for this feature.
- All 633 existing tests and build passed; 43 targeted tests including 9 new mounting/light/material regressions passed. CI and release next.

- PR #86. First CI run 39022562238 passed full units/build, building-detail and world-session, but the new lighting browser check sampled light-pool intensity before a slow software-rendered frame updated. Replaced the fixed 1s wait with polling for actual active lights and added light diagnostics. Lighting browser checks now have a dedicated CI job/artifact, separate from unrelated controls. Revalidation in progress.

### Release complete (2026-10-17 JST)
- Done: CI run 39023405946 passed all 4 jobs (642 unit tests, build, controls, building-detail, lighting, shared/offline sessions). The timing issue in the first CI run is resolved.
- Done: PR #86 auto-merged as 725073ce92cab85af5e6ec8b8d8ce5b81b4fd16d. GitHub Pages run 39024158043 succeeded.
- Done: fresh Chrome with service workers blocked fetched the public site (HTTP 200), loaded assets/index-DNpY3ORh.js and confirmed wall/floor lighting definitions and light-pool renderer are present.
- Public: https://mamamaki12.github.io/open-world/ . Furniture > Lighting contains 4 new fixtures and the now-lit existing floor lamp. No EC2 update or save migration is required.
- No remaining work for this request.
