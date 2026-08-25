# ASKWISE Aoyu — Codex Ready

## Fastest install
Copy the contents of this folder into the **root of the existing ASKWISE project**.

It will add only:
- `public/assets/aoyu/`
- `src/config/aoyu.ts`
- `docs/character/Aoyu_Asset_Guide.md`
- `design-source/`

## Important
Do not create a new ASKWISE repository for these assets.
Do not overwrite existing app logic.
If `src/config/aoyu.ts` already exists, merge rather than overwrite.

## Next Codex task
1. Inventory current Aoyu usages in ASKWISE.
2. Replace hard-coded image paths with `AOYU_ASSETS`.
3. Map learning states to the pose set.
4. Keep runtime behavior unchanged except the visual asset source.
5. Run existing tests/build and report changed files.
