# Town shop distribution

- Branch: fix/shared-world-auto-doors
- Request: distribute stores across town; preserve a mixed shopping district and stop placing four clothing stores in one row.

## Approach
- Define shared civic-space coordinates for several shopping areas outside player-owned residential plots. Mix clothing and other services in one district; distribute remaining clothing and automotive stores elsewhere.
- Keep venue IDs and saved player buildings unchanged. Rendering, entrances, collisions and navigation must use the same venue rectangles.
- Check building/road overlaps, approach paths and interactions. Record exact layout and browser results.

## Progress
- Planned; inspect all civic drawing and collision consumers before moving coordinates.

- Implemented south-west mixed shopping district (daily clothes, estate, atelier, exchange), north and north-east boutiques, pedestrian approach paths and map labels. Existing residential plots and venue IDs are unchanged.
- Road/residential/building overlap and pedestrian connectivity checks pass. Relocation exposed a fixture collision escape at a room corner; resolveVenue now chooses only displacement candidates inside room bounds.
- Next: integrate latest main (including newly merged salon), place salon in the mixed district, run full build/unit/browser checks.
