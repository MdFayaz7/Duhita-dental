# Duhita-dental

Website and admin dashboard for **Duhita Multispeciality Dental Centre**, Vijayawada.

| Folder | What it is |
|---|---|
| `duhita-frontend/` | React + Vite + Tailwind website, and the admin dashboard at `/admin` |
| `backend/` | FastAPI + PostgreSQL API (auth, registrations, appointments, schedule, doctors, research, galleries, WhatsApp confirmations) |

## Run locally

```bash
# API — needs Python 3.10+
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env              # add your DATABASE_URL, admin password and a JWT secret
alembic upgrade head              # create the schema
python -m app.seed --gallery      # admin user, doctor, gallery images
uvicorn app.main:app --reload --port 8000
```

```bash
# Website
cd duhita-frontend
npm install
npm run dev                       # http://localhost:5180 — admin at /admin
```

See `backend/README.md` for the full API reference.

## Deploy

Everything runs on a single Hostinger VPS, managed through Coolify. Vercel and Render are retired —
don't reintroduce them.

- Website: `duhitadental.com` (port 80)
- Backend API: `api.duhitadental.com` (port 8000)
- Duhita AI server: `ai.duhitadental.com` (port 8787)

### 1. PostgreSQL
In Coolify add a **PostgreSQL** resource on the same server (not publicly exposed) and copy its internal
connection URL into the backend's `DATABASE_URL`. The backend creates/updates its tables on start.

### 2. Backend
Set real secrets in `backend/.env` on the VPS (copy from `backend/.env.example`). `CORS_ORIGINS` must
include `https://duhitadental.com` (and the `www.` variant) or the website's API calls get CORS-blocked.
Redeploy via Coolify after any env change. First deploy only: `python -m app.seed --gallery`.

Uploaded photos, PDFs and clips are stored in Postgres, so one `pg_dump` backs up everything.

### 3. Frontend
Set `VITE_API_URL=https://api.duhitadental.com` on the VPS build, deploy via Coolify.

> Secrets live only in `backend/.env` / `ai-server/.env` on the VPS and locally. Never commit them.
