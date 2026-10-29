# Phoenix Nova™ official Logo V3 — review candidate

Task `XUANWU-BRAND-LOGO-V3-20261030`; Founder approval pending. No active website reference changes are included.

## Source and audit

The latest Founder-confirmed `logo(2).png` was attached as `logo(2) (1).png`. Its immutable copy is `phoenix-nova-primary-original.png`: RGB PNG, 1254 × 1254, SHA-256 **A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E**. Source bytes are preserved exactly.

Main at audit: `2e00b2c83bf54d5699fa3326d159448fda8afc0c`. Main's three previous V5 brand PNGs differ from this source. Their SHA-256 values are `BC4235B4C31CDC5E352E8D52FFB21BF517612ABC2A672A742EF562ED4815B125` (full old lockup), `66A7CD45177AB196AEF5A87410539A2D6FFF23BB7DB2AD06499A1B16BC57CFB6` (old mark), and `169E049BF88567B1CA4B0B6B0D39D15537227C9601271A10155D3A233B3FA6F4` (old system sheet). Their filenames do not establish current approval. Commit `7b6aab42f74afb4fd40436e68257c23d75f91e78` contains operations scripts, not the final logo.

Health remains on `feature/phoenix-health-landing-v1` at `ada733ec344067e56453503e444382464f6e53b8` with its uncommitted V2 work preserved separately. This branch starts directly from main; it does not import or overwrite those changes. Existing PR #29 is not changed by this asset PR.

## Deliverables

- **A Primary:** original PNG, lossless rectangular trim, and full-canvas transparent candidate. All original elements, platform wording and tagline are retained.
- **B Header:** transparent 520 × 160 and native-source 1040 × 320 (2×). The complete extracted phoenix/globe/star composite is placed at left; the extracted original Phoenix Nova™ wordmark is placed at right. No text is retyped and no font is substituted. The platform wording and motto are intentionally excluded from this authorised horizontal arrangement.
- **C Symbol:** native transparent extraction, 512/192/48/32/16 square PNGs, and review-only ICO. All contain the complete composite with padding. `phoenix-nova-wordmark-extracted.png` is an internal provenance part, not an additional approved logo style.
- `manifest.json` records file hashes, dimensions, alpha state, source crop, version and date. `review.html` provides all previews, transparent-background checks and isolated PC/mobile Header simulations.

## Extraction method and limits

The source has a near-neutral white matte (inspected blank-canvas channel spread ≤2) and no original alpha, layers or vector paths. The deterministic script derives alpha from channel spread: `round(clamp((maxRGB-minRGB-3)/12,0,1)*255)`. Native extracted RGB remains pixel-identical to its source region. Lossless trim also preserves every original RGB pixel in the selected rectangle. Resize uses aspect-preserving Lanczos; nothing is stretched.

The symbol's last coloured row is 838; the wordmark starts at 849, with a verified blank gap. The extraction split is in this gap, preserving the full tail/globe/star and all original wordmark strokes including TM.

Because the RGB source is already composited on white, its original prematte antialias colours cannot be exactly recovered. Unmatting would change RGB. We preserve RGB instead and expose any faint pale edge on dark backgrounds in the review page. These are transparency **review candidates**, not a claim of an original vector or flawless dark-background master. The untouched source remains the fidelity reference.

Visual inspection confirmed pale fringes on dark backgrounds and low contrast of the original navy artwork there. Transparent outputs are suitable for light-background review only at this stage; general-purpose transparent-master accuracy is **not established**. Do not use them on dark backgrounds. Native RGB correspondence proves provenance, not perfect alpha recovery.

16/32px cannot retain all fine globe and star details. They are delivered for actual-size inspection, not automatically applied. No silhouette simplification or new icon was invented. Prefer 48px or larger until Founder chooses the small-size policy.

No SVG is provided because no reliable vector source exists. No PNG is embedded in a fake SVG. Dark, monochrome, white-reversed and print-vector versions are second-batch TODOs only; dark check backgrounds are not new logo colourways.

## Reproduce and verify

Requires Python, Pillow and numpy. From the V5 project, run `python scripts/brand/build-official-v3.py` and `python scripts/brand/verify-official-v3.py`. The builder rejects any master hash mismatch. The verifier checks output hashes, source-pixel correspondence, complete composite bounds, transparent edges and display dimensions. Runtime dependencies of the website are unchanged.

For isolated browser review, serve this directory on `127.0.0.1:4392`, then run `node scripts/brand/capture-official-v3.mjs` with Playwright installed externally. Optional `BRAND_PLAYWRIGHT_PATH` selects its module entry and `BRAND_BROWSER_PATH` selects a browser executable. `review-validation.json` records four viewport checks and five screenshot hashes/dimensions; `asset-verification.json` records the 58 source/asset assertions. [AUDIT.md](AUDIT.md) records visual findings and outstanding decisions. These checks do not certify the live website, production rollout or Founder approval.

This asset PR does not alter Header/Footer/favicon references, Health code, database/authentication or independent Phoenix Meta / Phoenix Oriental assets. Production deployment and main merge remain unauthorised. After Founder acceptance, website integration is a separate explicit action.
