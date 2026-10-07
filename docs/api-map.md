# API Map

| Method | Path | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/health/live` | Public | Process liveness |
| GET | `/health/ready` | Public | Dependency readiness |
| GET | `/api/config` | Patient | Static application and workflow config |
| GET | `/api/context` | Any | Demo role and permission context |
| GET | `/api/visits/AL-2026-1048` | Any role with `visit:read` | Canonical visit state |
| POST | `/api/visits/:id/demo/select-doctor-finder` | PATIENT | Start guided intake |
| POST | `/api/visits/:id/intake/review` | RECEPTIONIST | Staff review intake routing |
| POST | `/api/visits/:id/check-in` | RECEPTIONIST | Check in patient and print token |
| POST | `/api/visits/:id/consultation/confirm-orders` | DOCTOR | Confirm CBC order and prescription queue |
| POST | `/api/visits/:id/pathology/status` | LAB_TECHNICIAN | Update CBC request status |
| POST | `/api/visits/:id/pharmacy/review` | PHARMACIST | Mark pharmacist review complete |
| POST | `/api/visits/:id/payment/record` | CASHIER | Record demo payment |
| POST | `/api/visits/:id/follow-up/schedule` | CARE_COORDINATOR | Schedule follow-up and reminders |
| POST | `/api/demo/reset` | ADMIN | Reset local demo state |

Command endpoints require `X-Role`, `X-Correlation-Id`, and `Idempotency-Key` headers from the frontend client.
