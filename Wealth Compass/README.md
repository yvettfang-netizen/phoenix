# Phoenix Wealth Compass™ V0.1

A mobile-first engineering foundation for a family wealth health and long-term planning entry experience.

## Status

`BUSINESS_RULES_STATUS=BLOCKED` / `RULES_NOT_LOADED`

Official question and scoring/routing sources are absent. This project intentionally does not score assessments, assign personas, or generate report conclusions. It is not a finished product.

## Run

```bash
npm install
npm run dev
```

Quality commands:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Routes: `/`, `/assessment`, `/consent`, `/result`, `/report/[id]`, and `/api/health`.

See `docs/` for scope, data contracts, consent boundaries, source status, baseline, and handoff notes.
