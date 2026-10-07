# Security Notes

- Enforce authentication and RBAC in the backend; the current `X-Role` header is a local demo stand-in.
- Scope every query and command by tenant and facility.
- Store audit events for all workflow-changing commands.
- Use idempotency keys for command endpoints to prevent accidental duplicate clinical/billing transitions.
- Keep PHI out of logs where possible and avoid exposing raw stack traces.
- Do not claim ABDM/FHIR/NABH/NABL certification. The approved label is `ABDM: Integration in progress`.
- Do not present AI output as diagnosis, prescribing advice, automated substitution, or completed clinical decision-making.
