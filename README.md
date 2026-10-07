# ArogyaLoop

ArogyaLoop is a healthcare workflow demo rebuilt from the approved Stitch UX reference while keeping requirements as the functional source of truth.

## Local Run

1. Install dependencies with `pnpm install`.
2. Start the backend: `pnpm --filter @arogyaloop/backend dev`.
3. Start the frontend: `pnpm --filter @arogyaloop/frontend dev`.
4. Open `http://127.0.0.1:5173`.

The current backend uses JSON-file persistence for local development so the demo journey survives browser refreshes. PostgreSQL remains the production target and is documented under `docs/` and `infrastructure/migrations/`.

## Docker Compose

Copy `.env.example` to `.env`, then run `docker compose build` and `docker compose up -d`. Open `http://localhost:5173`. The full Git and DigitalOcean deployment guide is in [docs/docker-deployment.md](docs/docker-deployment.md).

## Health

- `GET /health/live`
- `GET /health/ready`
- `GET /api/health`

## Demo Boundary

All patient, staff, billing, CBC, and operational values are fictional demo data. The UI intentionally shows only `ABDM: Integration in progress` and does not claim ABDM certification, FHIR compliance, NABH/NABL status, diagnosis, or automated medication decisions.
