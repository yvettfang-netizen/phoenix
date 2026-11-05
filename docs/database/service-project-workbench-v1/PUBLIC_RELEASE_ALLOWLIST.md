# Workbench public candidate allowlist

Extends only the scoped Canonical candidate allowlist, not the private repository's history. Existing mixed public history is not reclassified as safe by this task.

Allowed after scoped scan and human inspection: new0038 forward candidate, v0038 verification code with explicitly synthetic IDs/names, optional backend route/adapter, website BFF/DTO/workbench components and routes, Family Center optional seam, this delivery folder and the dedicated pinned CI workflow. These files contain no real identity, server address, production credential or real document. Loopback URLs and random fixture container labels describe disposable local tests only.

Remain private/untracked: all .env/.dev.vars/pgpass, generated credential values, private object bytes, dumps/globals/backup manifest files, raw local runtime logs, machine/ACL output, real source references/identity registration and production topology. Raw **synthetic** verification transcripts and screenshots are archived in the private evidence branch. CI artifacts are restricted to explicitly synthetic JSON results and screenshots; no database dump, configuration, private-key material or actual patient/client information.

Scan uses pinned Gitleaks with network disabled and redaction enabled against the exact staged file set. A separate scoped inspection checks server addresses, credential patterns and accidental runtime files. A zero-finding scan is not proof of a safe full Git history or real-data privacy compliance. Credible sensitive findings stop release; do not edit old migrations to silence scanners.
