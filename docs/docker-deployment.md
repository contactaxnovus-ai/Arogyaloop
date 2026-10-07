# Docker, Git and DigitalOcean

## Run with Docker Compose

Prerequisites: Docker Desktop on Windows/macOS, or Docker Engine plus the Compose plugin on Linux.

From the repository root:

```bash
cp .env.example .env
docker compose build
docker compose up -d
docker compose ps
```

Open `http://localhost:5173` locally. The public frontend is served by Nginx; `/api/*` and `/health/*` are proxied internally to the backend. Backend state is kept in the named `backend-data` volume. The production image intentionally builds with an empty `VITE_API_BASE_URL`, so the browser calls same-origin `/api/*`; never set it to `http://127.0.0.1:4000` on a Droplet.

Useful checks:

```bash
curl http://localhost:5173/health
curl http://localhost:5173/health/ready
docker compose logs -f backend
docker compose down
```

`docker compose down` keeps the named volume. Do not use `docker compose down -v` unless you intentionally want to delete the persisted application state.

This Compose file packages the current implementation, whose local persistence adapter is JSON. PostgreSQL is not wired into `apps/backend/src/server.js` yet; do not treat the old migration files as evidence that production PostgreSQL persistence is active.

## Commit and push to Git

The working folder currently has no `.git` directory or configured remote. Create a repository on GitHub/GitLab/Bitbucket first, then run from `C:\Work\Arogyaloop` (PowerShell) or the repository root (Linux/macOS):

```bash
git init
git add .
git commit -m "Containerize ArogyaLoop application"
git branch -M main
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

Replace the remote URL. Before the first commit, inspect `git status` and confirm that `.env`, database dumps, credentials, uploaded reports, and runtime volumes are not being committed. Keep real secrets only in the deployment environment.

For later changes:

```bash
git add docker docker-compose.yml .env.example README.md docs
git commit -m "Describe the change"
git push
```

## Deploy to a DigitalOcean Droplet

1. Create an Ubuntu LTS Droplet. Use a firewall/security group that allows SSH (22) and HTTP (80); expose HTTPS (443) after TLS is configured. Do not expose backend port 4000 or PostgreSQL to the public internet.

2. Connect and install Docker:

```bash
ssh root@DROPLET_IP
apt update && apt upgrade -y
apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

3. Create a deploy user, then use that user for the application:

```bash
adduser deploy
usermod -aG docker deploy
su - deploy
git clone https://github.com/OWNER/REPOSITORY.git arogyaloop
cd arogyaloop
cp .env.example .env
```

4. Edit `.env` on the droplet. Set `APP_PORT=80` and `DEMO_MODE=false` only when the environment is ready for non-demo operation. The current backend still uses JSON state and demo-style authentication, so do not expose this build to real patient data.

5. Start the stack:

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1/health
```

If the browser shows `API unavailable` or `Failed to fetch` after an earlier deployment, rebuild the frontend bundle and recreate both containers:

```bash
docker compose down
docker compose build --no-cache frontend backend
docker compose up -d
docker compose ps
curl http://127.0.0.1/health/ready
curl http://127.0.0.1/api/config
```

Do not use an old `.env` value such as `VITE_API_BASE_URL=http://127.0.0.1:4000`; that address means the browser client itself, not the Droplet. The Compose production build ignores that value and uses the internal Nginx proxy.

6. Visit `http://DROPLET_IP`. For a domain, point an A record to the droplet and put a TLS reverse proxy such as Caddy or Nginx in front of this Compose service. Keep the app bound to a private host port when another proxy owns ports 80/443.

## First login and hospital setup

The public URL opens the no-login patient kiosk. Hospital configuration is available only after staff login:

1. Open `http://DROPLET_IP/?staff=1`, or select **Staff login** on the kiosk.
2. Sign in with the seeded application-admin account shown in the staff login directory. When the tenant is still `Hospital setup pending`, the application admin is now taken directly to Hospital Application Setup.
3. If the tenant has already been configured, open **Hospital System Settings** in the left navigation.
4. Configure tenant/facility identity, hospital type, departments, specialties and routing descriptions.
5. Configure doctors, laboratory tests, pathlabs, pharmacies and user logins in the remaining setup tabs.
6. Press **Save setup**, then log out and sign in as each created role to verify its scoped workspace.

The application-admin login is a demo login in this version. It is not a production authentication system. If the staff directory is empty or the local demo visits are missing, the backend volume was probably created from an older image or the deployment was started with a different state volume.

To inspect that condition without deleting data:

```bash
docker compose ps
docker compose logs --tail=100 backend
docker compose exec backend ls -l /app/apps/backend/data
```

Back up the current state before any reset:

```bash
docker compose cp backend:/app/apps/backend/data/demo-state.json ./demo-state.backup.json
```

Only after that backup, and only if this is a new empty deployment, recreate the demo volume:

```bash
docker compose down
docker volume rm arogyaloop_backend-data
docker compose up -d --build
```

Do not run the volume-removal command on a hospital deployment containing saved configuration or patient data.

7. Update the application:

```bash
cd ~/arogyaloop
git pull --ff-only
docker compose up -d --build
docker image prune -f
```

8. Back up state before upgrades. The named volume is not a substitute for backups. A simple JSON-state backup is:

```bash
docker compose cp backend:/app/apps/backend/data/demo-state.json ./demo-state.backup.json
```

## Production blockers

Before handling real hospital data, replace the demo `X-Role` header authentication with a real identity/session system, enforce tenant/facility predicates in the backend, move persistence to PostgreSQL with migrations and backups, configure HTTPS, secrets, MFA, audit retention, monitoring, and secure report storage. The application’s security notes and onboarding model describe these requirements in more detail.
