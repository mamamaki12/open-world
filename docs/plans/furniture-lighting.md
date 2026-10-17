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
