# Hospital Onboarding And Access Model

This product is one deployable application with role-specific workspaces. Users must never receive every screen by default. The backend must decide what a user can see and do based on hospital, facility, role, permissions, and data scope.

## Stepwise Hospital Setup

1. Create tenant
   - Register the hospital group as a tenant.
   - Assign tenant ID, legal/display name, country, timezone, locale, currency, and data residency settings.
   - Configure whether the tenant is single hospital, multi-branch, or network deployment.

2. Create facilities
   - Add each hospital/clinic facility under the tenant.
   - Configure departments, OPD wings, rooms, counters, lab/pharmacy/billing locations, queue prefixes, operating hours, and contact points.

3. Configure master data
   - Departments and specialties.
   - Doctors and staff profiles.
   - Visit types, appointment types, queue rules, token rules.
   - Diagnostic services, pharmacy fulfilment rules, billing items, taxes, payment modes.
   - Languages, patient communication templates, safety disclaimers, and ABDM integration state.

4. Configure workflow templates
   - Define which stages are enabled for the hospital: kiosk, intake, reception, doctor, pathology, pharmacy, billing, follow-up, operations.
   - Define stage owners and allowed transitions.
   - Configure whether labs/pharmacy/billing are in-house or external.
   - Configure escalation rules, handoffs, and exception states.

5. Create roles and permission sets
   - Start from product defaults: Patient, Receptionist, Doctor, Lab Technician, Pharmacist, Cashier, Care Coordinator, Operations Manager, Hospital Admin, Application Admin.
   - Clone/customize permissions per hospital if needed.
   - Keep permissions atomic, such as `visit:read`, `visit:checkIn`, `consultation:order`, `pathology:update`, `payment:record`, `user:manage`.

6. Create users
   - Hospital admin creates staff users for that hospital only.
   - Assign each user to tenant, facility, departments, role(s), and optional provider profile.
   - Enforce MFA for admins and high-risk clinical/billing roles.

7. Assign data scope
   - Tenant scope: which hospital group the user belongs to.
   - Facility scope: which branch/facility the user can access.
   - Department scope: which departments the user can view or operate in.
   - Patient/visit scope: which patient records are visible based on role and care relationship.

8. Validate access
   - Log in as each role and confirm only required screens appear.
   - Verify direct API calls are blocked even if a hidden route is manually opened.
   - Verify audit logs capture setup changes and workflow actions.

9. Go live
   - Seed initial appointments, queues, staff schedules, billing catalogues, and service catalogues.
   - Enable integrations only when configured and tested.
   - Keep demo data separated from production tenant data.

## Role-Based Views

| Role | Default screens |
| --- | --- |
| Patient | Kiosk, own visit summary, reports/prescriptions released to patient, follow-up |
| Receptionist | Intake review, arrivals queue, check-in, token, wayfinding |
| Doctor | Doctor workspace, assigned appointments, consultation notes, orders, reports for own patients |
| Lab Technician | Lab queue, specimen status, report entry/release workflow |
| Pharmacist | Prescription queue, pharmacist review, fulfilment |
| Cashier | Billing queue, payment collection, receipt |
| Care Coordinator | Follow-up queue, reminder preferences, patient communication |
| Operations Manager | Facility-level operational dashboard and journey status |
| Hospital Admin | Hospital configuration, hospital users, facility data, audit for own hospital |
| Application Admin | All tenant/facility configuration, all views, support tooling, platform audit |

Frontend navigation must be generated from the authenticated user's permissions. Backend APIs must independently enforce the same permissions.

## Admin Responsibilities

Hospital Admin:

- Manage users for their own tenant/facility.
- Assign hospital roles and department/facility scopes.
- Configure local departments, rooms, counters, providers, schedules, billing catalogues, and workflow options.
- View audit logs for their hospital only.

Application Admin:

- Create and manage tenants.
- Configure all hospitals, facilities, users, roles, feature flags, and integrations.
- Access all tenant data only under strict privileged access policy.
- Support tenant onboarding, suspend tenants, rotate credentials, and investigate audit trails.

## Shared Database Data Separation

Every dynamic table must carry `tenant_id`. Facility-owned records must also carry `facility_id`.

Required safeguards:

- Backend derives tenant/facility from authenticated session, never from free-form frontend input.
- All queries include tenant scope.
- Facility-level users get facility predicates.
- Department-level users get department predicates where applicable.
- Patient-facing users get patient identity predicates.
- Application admin access is explicit, audited, and should support break-glass reason capture.
- PostgreSQL row-level security should be considered for defense in depth.
- Unique indexes should include tenant ID when values can repeat across hospitals.

Example:

```sql
SELECT *
FROM visits
WHERE tenant_id = :session_tenant_id
  AND facility_id = ANY(:session_facility_ids)
  AND (:can_view_all_departments OR department_id = ANY(:session_department_ids));
```

## Product Components Required For Hospital Deployment

- Tenant and facility management.
- User, role, permission, and scope management.
- Authentication, MFA, password policy, session policy, SSO readiness.
- Configurable workflow engine.
- Department/provider/schedule/room/counter master data.
- Appointment, queue, visit, clinical order, diagnostics, pharmacy, billing, payment, follow-up modules.
- Audit trail and privileged access monitoring.
- Configuration import/export and setup checklist.
- Environment, backup, restore, migration, observability, and support tooling.
- Integration registry for ABDM, SMS/WhatsApp, payments, LIS/HIS/EMR, pharmacy, and identity providers.

## Critical Product Rule

Hiding frontend screens is not security. Security exists only when the backend authorizes every read and write against the authenticated user's tenant, facility, role, permission, and data scope.
