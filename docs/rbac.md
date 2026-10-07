# RBAC Matrix

| Role | Allowed workflow actions |
| --- | --- |
| PATIENT | Read visit, select doctor finder |
| RECEPTIONIST | Read visit, review intake, check in patient |
| DOCTOR | Read visit, confirm consultation orders |
| LAB_TECHNICIAN | Read visit, update pathology status |
| PHARMACIST | Read visit, complete pharmacist review |
| CASHIER | Read visit, record payment |
| CARE_COORDINATOR | Read visit, schedule follow-up |
| OPERATIONS_MANAGER | Read visit and audit events |
| ADMIN | Reset demo and read operational data |

The frontend hides or disables actions where useful, but the backend enforces authorization.

## Admin Roles

Hospital Admin and Application Admin are separate roles.

- Hospital Admin can configure users, roles, departments, rooms, schedules, billing catalogues, and workflow options for their own tenant/facility only.
- Application Admin can create tenants, configure hospitals, manage all role assignments, view all workspaces, and perform platform support functions across tenants.

Application Admin access must be fully audited and should require MFA plus privileged-access reason capture in production.
