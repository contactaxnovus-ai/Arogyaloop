# Data Model

Production persistence targets PostgreSQL with an ORM/migration layer. Dynamic workflow data belongs in tables; presentation labels and workflow statuses belong in versioned configuration.

## Core Entities

- Tenant, facility, department, provider, role, user.
- Patient, visit, appointment, token, queue item.
- Intake answer, routing recommendation, staff review.
- Consultation note, vitals, clinical order, diagnostic request, CBC report row.
- Prescription queue item, pharmacist review, billing line, payment.
- Follow-up appointment, reminder preference, communication.
- Audit event with tenant, facility, actor, resource, correlation, idempotency, previous and next summaries.

## Storage Rules

- Monetary values are stored as integer minor units with currency.
- Clinical actions are append-audited.
- Visit data is tenant and facility scoped.
- Demo seed patient Meera Sharma is seed data only and must not be hard-coded in React components.

## Multi-Tenant Rules

- Every dynamic table must include `tenant_id`.
- Facility-owned records must include `facility_id`.
- User access is resolved from authenticated identity to tenant, facility, department, role, permission, and optional provider scope.
- Shared database deployments must enforce tenant predicates in every repository query.
- PostgreSQL row-level security should be added for high-assurance deployments.
- Application Admin cross-tenant access must be explicit and audited.
