# NIP Switch Composite Integration

The Access Web and fin-proxy agents accepted the v1 composite contract on 2026-08-10. The representative complete and partial-response fixtures are encoded in `src/app/accounting/accounting.service.spec.ts` and match that final agreement:

- collection GET returns `{ "switches": [...] }` and is unwrapped by the web service;
- absent actual components are represented only by `{ "configured": false }`;
- successful PUT returns the actual composite item plus a structured `operation`;
- a coordination error retains the ordinary HTTP status and adds `retryable` plus the same structured `operation` shape.

Fin-proxy deployment of `GET`/`PUT /access/api/v1/admin/nip-switch-configurations` in each target environment is a release-order dependency, not a change to the v1 contract. Contract acceptance confirms the endpoint shape but is not evidence that a particular environment has deployed it. Enable the unified route only after an integration smoke test confirms collection GET, encoded detail GET, and PUT are reachable in that environment.
