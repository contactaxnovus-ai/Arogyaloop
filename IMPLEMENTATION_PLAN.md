# ArogyaLoop Implementation Plan

## Revised UX Assessment - 7 October 2026

Reference: `reference/ux/stitch_remix_of_arogyaloop_patient_journey_prototype` (16 HTML/screenshot screens, architecture guide and Clinical Precision design tokens).

The revised reference replaces the oversized journey chrome with an 88px hospital header, 256px role navigation, compact workspace heading and queue-first departmental layouts. Rebuild these with React, using actual API records. Do not copy generated HTML, fabricated clinical findings or integration indicators.

| Reference workspace | Application mapping |
| --- | --- |
| Kiosk touch terminal | Separate three-choice home, bilingual navigation, large touch targets; no staff sidebar |
| QR/token issue | Existing appointment lookup and confirmation form; no decorative QR presented as a working scanner |
| Register / duplicate check | Existing name/mobile identity checks, sex and optional age; preserve duplicate selection flow |
| Find doctor | Existing patient lookup followed by guided search and configured doctor slots |
| Guided intake / history | Patient history beside intake and recommendation; no fabricated confidence or vitals |
| Reception omni-channel desk | Queue roster first; assisted registration expandable in the same workspace; selected visit and route review alongside |
| Doctor CPOE | Searchable queue rail, consultation/history column, separate lab and prescription order rail |
| Pathology bench | Searchable request rail, report upload and status workspace, requested-test details |
| Pharmacy | Prescription queue, pharmacist review, fulfilment and invoice summary |
| Central billing | Dedicated cashier composition with queue, invoice and payment action; no pharmacist controls |
| Operations | API-derived department counts, workspace links, visit selection and audit records |
| Facility setup | Tabbed facility/departments, preserving editable current settings |
| Doctor roster | Doctor profile/photo/specialty/slot controls in a dedicated tab |
| Pathology/pharmacy masters | Test catalogue and service-unit configuration tabs |
| Tariff master | Reference-only extension: current backend has no tariff CRUD/payer matrix contract; do not invent financial rules |
| Terminal configuration | Existing module configuration; hardware telemetry, scanner calibration and thermal daemon require separate integrations |

Reusable elements: role-aware shell/navigation, queue rail with search/selected state, workspace titles, setup tabs, consistent cards/forms/statuses and responsive two/three-column layouts. Long symptoms remain in visit detail, not global chrome. Tables scroll within their own region. No fixed floating action bar may cover content.

Backend-dependent behavior retained: patient lookup/registration, routing review, selection of visits, consultation save, diagnostic/prescription orders, report publication, pharmacist review, invoice/payment commands and setup persistence. UI changes must not broaden API permissions. Cashier and pharmacy actions are presented separately.

Configuration: theme tokens, role workspace labels and layout breakpoints. PostgreSQL target: patients, visits, reports, doctor/specialty mappings, slots, service units, users, tariffs and terminal records. API credentials belong in secret storage. Existing JSON persistence is unchanged by this visual migration.

Demo-only / discrepancies: prototype staff, patient identities, vitals, drug recommendations, prices, queues, wait estimates, ABHA identifiers, hardware metrics, certifications, live FHIR, payment gateway, insurance approvals and drug interaction checks are not evidence of implemented functionality. Requirement permits only ABDM integration-in-progress. Do not adopt prototype triage thresholds, automatic substitutions, automatic emergency queue overrides or ABHA creation as clinical rules. The reference screenshots themselves clip headings under their fixed header; use flow-based grid placement instead of reproducing that defect. Patient/follow-up has no replacement screen and retains its functional timeline with the shared updated design.

Verification: TypeScript/build; browser checks of each available role, setup tabs and kiosk modes; wide/narrow layouts, long text, empty queues and selected-record transitions. Record actual results separately; build success alone is not visual or end-to-end validation.

## Product Interpretation

ArogyaLoop is a healthcare workflow platform for coordinating a patient journey across kiosk, reception, doctor, pathology, pharmacy, billing, follow-up, and operations. The implementation must not be a hard-coded Stitch export. It must expose a reusable React UI backed by API-owned workflow state, backend-enforced roles, audit events, configuration, and a PostgreSQL-ready data model.

Primary source of truth is `reference/requirements/ArogyaLoop_Requirement.txt`. The attached master prompt is the architectural, engineering, and security source of truth. Stitch UX is visual/workflow reference only. Prototype clinical claims, compliance claims, staff details, statistics, extra investigations, medication choices, and operational ROI numbers are fictional demo content unless the requirements explicitly support them.

## Stitch Components and Layouts Reused Conceptually

- Shared staff shell: fixed top patient/visit banner, horizontal journey tracker, left workflow navigation, and bottom "Demo Tour / Next Step" control.
- Reception kiosk: large touch cards, bilingual English/Hindi labels, accessible helper actions, and a highlighted demo path for "I need help finding a doctor".
- Guided intake: three-question conversational flow, patient-friendly department recommendation, safety disclaimer, and staff override control.
- Reception workspace: compact queue table, selected patient detail panel, check-in action, token/wayfinding preview, and queue status update.
- Doctor workspace: vitals strip, consultation notes, human-reviewed order confirmation, next-step visibility, and modal-style confirmation.
- Pathology workspace: specimen lifecycle status, CBC request identity, sample report viewer, and report availability signal.
- Pharmacy/payment workspace: pharmacist review checklist, prescription fulfilment, INR billing summary, and payment completion state.
- Patient follow-up view: mobile-first visit summary, timeline, report/prescription/payment tiles, reminder state, and follow-up appointment card.
- Operations overview: end-to-end journey summary, step ownership, status chips, and compact buyer-presentation close screen.

## Demo-Only Elements

- Specific diagnoses such as "microcytic hypochromic anemia" and "iron deficiency anemia" are not production rules.
- Extra tests and investigations such as serum ferritin, TSH, Free T4, RBS, peripheral smear, and analyzer-specific claims exceed the CBC-only sample plan unless clearly labeled as demo/reference.
- Medicines, brands, batch numbers, doses, quantities, and counselling text are demo prescription content and require clinician/pharmacist review in the product.
- ABHA-linked rates, completed ABHA exchange, "FHIR R4 Connected/Compliant", "ABDM Sync OK", "NABH/NABL accredited", certification labels, gateway settlement, and regulator-ready claims are unsupported. The product may only show "ABDM: Integration in progress" discreetly.
- Staff names outside the requirement, operational KPIs, throughput claims, ROI percentages, zero-defect claims, and audit/export assertions are fictional demo data.
- Remote images and generated profile/lab imagery from the prototype are visual placeholders, not application assets.

## Prototype Elements to Become Reusable Components

- `AppShell`: role-aware page chrome, navigation, patient context strip, and responsive layout rules.
- `JourneyTracker`: reusable stage tracker for all staff-facing screens and the operations close.
- `StatusChip` and `Badge`: semantic status, AI-assisted, ABDM integration, demo-data, and completion labels.
- `MetricCard`: compact operational summary cards with restrained, configurable values.
- `ActionButton` and `IconButton`: consistent 44px controls using icon-first design.
- `PatientSummaryCard`: visit identity, reason, doctor, token, department, and appointment.
- `RoleQueueTable`: reception/lab/pharmacy queues with reusable columns and selected-row states.
- `Timeline`: patient journey and patient-facing visit history.
- `OrderPanel`: doctor order review and confirmation surface.
- `ReportViewer`: CBC report/status display with demo-data labeling.
- `BillingSummary`: INR itemization, payment status, and demo totals.
- `MobileCompanionPreview`: patient mobile presentation of the same visit data.

## Architecture

- Frontend: React/Vite application composed from reusable screen and design-system components. It must not access storage directly.
- Backend: API layer for canonical visit state, workflow commands, RBAC, idempotency, and audit. Current implementation uses JSON-file development persistence; production target is Node/NestJS/Prisma/PostgreSQL.
- Configuration: product labels, workflow stages, statuses, terminology, and RBAC live under `config/`.
- Database target: dynamic operational data belongs in PostgreSQL, with migrations documented under `infrastructure/migrations/`.
- Health: `/health/live`, `/health/ready`, and `/api/health` support deployment readiness.

## Module Map

- Patient arrival: kiosk and guided intake.
- Reception: routing review, queue, check-in, token, and directions.
- Consultation: doctor note, CBC order confirmation, prescription queue.
- Diagnostics: CBC request lifecycle and sample report visibility.
- Pharmacy/billing: pharmacist review, fulfilment readiness, billing lines, payment.
- Follow-up: visit summary, reminders, Day 14 appointment.
- Operations: journey status and audit event reading.

## Prototype Behaviours Needing Backend APIs

- Fetch canonical demo visit data, patient profile, appointment, hospital configuration, and role-specific screen data.
- Create/update intake answers and store staff-reviewed department routing decision.
- Check in a patient, generate token status, and record wayfinding instructions.
- Record consultation notes and submit human-reviewed CBC/pathology request plus prescription queue item.
- Advance pathology request status from requested to sample collected to report ready.
- Publish the CBC report to doctor and patient timelines.
- Review/fulfil pharmacy prescription, calculate demo billing lines, and mark payment state.
- Schedule follow-up, create reminder/communication records, and append visit history.
- Read operations overview from the same journey event stream.

Implemented command API map is documented in `docs/api-map.md`.

## Values Moving to Configuration

- Product name, hospital name, city, department labels, OPD wing/room naming, language options, and stage labels.
- Theme tokens: colors, typography, radii, spacing, shadows, and status color mapping.
- Demo tour order, route slugs, staff role labels, and safe disclaimer copy.
- Integration label text, especially `ABDM: Integration in progress`.
- Currency formatting locale and default INR symbol.

Implemented configuration files:

- `config/application/product.json`
- `config/workflows/opd-general.json`
- `config/permissions/rbac.json`
- `config/terminology/en-IN.json`

## Values Belonging in PostgreSQL

- Patient, visit, appointment, provider, department, token, and queue records.
- Intake answers, routing recommendation, staff override, and review metadata.
- Journey events with owner, status, timestamp, and screen/stage identifiers.
- Consultation notes, vitals, orders, pathology requests, lab status transitions, and CBC report rows.
- Prescription, pharmacist review, fulfilment, billing line items, payment status, and receipt metadata.
- Patient timeline entries, follow-up appointment, reminder preferences, and communications.
- Audit records for user-triggered workflow actions.

The PostgreSQL target is captured in `infrastructure/migrations/001_initial_schema.sql`; local demo persistence is intentionally limited to a JSON-file adapter.

## RBAC And Security

- Backend command routes enforce role permissions using the demo RBAC matrix.
- Every workflow-changing command records an audit event with role, tenant, facility, visit, action, correlation ID, and idempotency key.
- High-impact frontend actions show explicit confirmations.
- The frontend displays loading and error states and uses an API client for correlation/idempotency headers.
- The current `X-Role` header is a demo substitute for real identity. Production must replace it with authenticated sessions/JWTs and server-side user-role resolution.
- Hospital onboarding, role-scoped views, Application Admin, Hospital Admin, and shared-database data separation are defined in `docs/hospital-onboarding-and-access.md`.

## Requirement vs Prototype Discrepancies

- Requirement says all information is fictional demo data and AI guidance must not be presented as diagnosis; the prototype includes diagnostic impressions. Implementation will use cautious language such as "doctor notes" and "sample CBC finding", with demo labels.
- Requirement specifies CBC; prototype adds peripheral smear and other test suggestions. Implementation will center CBC and avoid treating extra tests as workflow requirements.
- Requirement allows only discreet ABDM "Integration in progress"; prototype shows ABHA linked, ABDM/FHIR compliance, NABH/NABL, gateway, and certification-style claims. Implementation will remove or downgrade those.
- Requirement asks for pharmacist review and no automatic substitution; prototype includes equivalents and automation-heavy fulfilment. Implementation will keep pharmacist review prominent and avoid substitution claims.
- Requirement asks for completed/pending/owner visibility; prototype asserts unsupported performance metrics. Implementation will show ownership and status without unverified ROI/compliance claims.
- Requirement states same patient, visit ID, doctor, and care plan throughout; prototype contains inconsistent dates, rooms, charges, medication names, and follow-up details. Implementation will normalize around Meera Sharma, visit `AL-2026-1048`, Dr Ananya Rao, CBC, prescription sent to hospital pharmacy, and follow-up.

## Current Implementation Scope

Implemented:

- React UI closely following Stitch visual structure without copying Stitch HTML.
- Backend APIs for config, canonical visit reads, command transitions, health, RBAC checks, idempotency, and audit events.
- Refresh-safe demo state through backend JSON persistence.
- Demo reset, previous/next tour controls, loading/error UI, and role-scoped commands.
- Documentation for architecture, API map, RBAC, data model, security, journey, environment, Docker, and PostgreSQL target schema.

Not yet production complete:

- Replace JSON-file adapter with Prisma/PostgreSQL repository implementation.
- Add real authentication, tenant user management, session handling, and facility-scoped query enforcement from authenticated identity.
- Add automated tests and migration execution.
- Add complete form validation with Zod/React Hook Form and full i18n extraction.
- Add observability, structured logging, and CI/CD.

## Implementation Approach

1. Keep Stitch as UX intent only; use application components and API state.
2. Drive all dynamic visit state through backend APIs.
3. Enforce role-sensitive commands server-side and audit every workflow transition.
4. Keep static labels/statuses/configuration outside components.
5. Preserve a clean migration path from the JSON development adapter to PostgreSQL/Prisma.
6. Verify backend syntax/API behavior and frontend TypeScript/build before handoff.
