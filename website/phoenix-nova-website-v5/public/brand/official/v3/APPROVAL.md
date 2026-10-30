# Founder acceptance — 2026-10-30

Founder reviewed Draft PR #30 and explicitly selected: **“通过三种排布，仅用于浅色底；暂不启用小尺寸 favicon”**.

This accepts the Primary, horizontal Header and complete Symbol arrangements, subject to light backgrounds. The historical manifest, screenshots and audit in asset commit `a84ec8f2d570f55edd7f24369e794e0650db3c2a` retain their review-time status; this record captures the later approval without changing source or asset bytes.

Website use in the Health development branch:

- Header and compact assessment chrome: `phoenix-nova-header@2x.png`, on an explicit ivory backing.
- Footer (superseded by the later Founder Footer instruction below): the initial Health V2 implementation used `phoenix-nova-primary-trimmed.png` on its white backing.
- Homepage emblem: `phoenix-nova-symbol-transparent.png`, contained on an explicit ivory backing.
- Brand archive/proof: `phoenix-nova-primary-original.png`, byte-identical to the Founder source.
- No favicon candidate or second-batch dark, mono, reversed or print-vector version is enabled or produced by this acceptance.

Source SHA-256 remains `A48513AA31039B0467C6322B64FF2ED69DC74CDA976C274B22328F70C8C7E45E`. Approval does not authorise main merge, production deployment or database changes. Health page visual acceptance remains a separate Founder step.

## Later Founder Footer instruction — Health V2.1, 2026-10-30

Founder explicitly requires the transparent original-colour horizontal logo on a warm ivory Footer, without a white rectangle or frame. This supersedes the initial Footer treatment above. Shared main-site Footer now uses the already approved `phoenix-nova-header@2x.png` (1040 × 320 RGBA), on `#F8F6F1`, at 210 CSS px desktop and 165 CSS px mobile. Its wrapper and image have no background, border, mask or colour filter. The original master and all derived asset bytes remain unchanged.

Horizontal asset SHA-256: `C566AA2813A1D08D02C71230C7E2360BA2C681A056F1A7FDB900C2A40396B4DA`.

This uses real PNG alpha, not a simulated colour fill. The existing white-matted edge limitation still precludes dark-background use; no dark adaptation or favicon is enabled. There is no reliable vector source, so no SVG is manufactured. Transparency proof and actual desktop/mobile Footer screenshots are recorded with the Health V2.1 review package.
