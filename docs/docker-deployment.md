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

Open `http://localhost:5173` locally. The public frontend is served by Nginx; `/api/*` and `/health/*` are proxied internally to the backend. Backend state is kept in the named `backend-data` volume.

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

6. Visit `http://DROPLET_IP`. For a domain, point an A record to the droplet and put a TLS reverse proxy such as Caddy or Nginx in front of this Compose service. Keep the app bound to a private host port when another proxy owns ports 80/443.

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
