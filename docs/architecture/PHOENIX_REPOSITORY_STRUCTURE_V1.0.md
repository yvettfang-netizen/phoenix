# Phoenix repository structure V1.0

## Target layout

```text
phoenix/
├── apps/
│   ├── website/
│   ├── compass/
│   ├── family-os/
│   └── founder-os/
├── packages/
│   └── shared-contracts/
├── database/
│   └── canonical/
│       ├── README.md
│       ├── schema/
│       ├── migrations/
│       ├── policies/
│       └── verification/
├── docs/
│   ├── architecture/
│   └── database/
└── archive/
    └── legacy/
```

## Current transition rule

This change establishes the target boundaries without moving existing
applications. Current source remains in `website/`, `Phoenix Compass/` and
`Phoenix Family OS/`. Their `apps/*` files are routing manifests.

The verified Canonical database source was copied into
`database/canonical/`. The private source branch is retained as immutable
provenance until the main-repository copy is reviewed and merged.

## Non-goals

- no application rewrite;
- no production deployment or database switch;
- no real data or legacy migration;
- no deletion of old branches, repositories or database volumes;
- no relocation of Founder OS or Operations OS business assets.
