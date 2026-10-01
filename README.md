# Duhita-dental

Website and admin dashboard for **Duhita Multispeciality Dental Centre**, Vijayawada.

| Folder | What it is |
|---|---|
| `duhita-frontend/` | React + Vite + Tailwind website, and the admin dashboard at `/admin` |
| `backend/` | FastAPI + MongoDB API (auth, registrations, appointments, schedule, doctors, research, galleries) |

## Run locally

```bash
# API — needs Python 3.10+
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # add your MONGO_URI, admin password and a JWT secret
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

### 1. MongoDB Atlas
Network Access → allow the VPS's IP (or `0.0.0.0/0` if the VPS has no fixed IP). Keep a strong database password.

### 2. Backend
Set real secrets in `backend/.env` on the VPS (copy from `backend/.env.example`). `CORS_ORIGINS` must
include `https://duhitadental.com` (and the `www.` variant) or the website's API calls get CORS-blocked.
Redeploy via Coolify after any env change. First deploy only: `python -m app.seed --gallery`.

Uploaded photos and PDFs are stored in MongoDB (GridFS).

### 3. Frontend
Set `VITE_API_URL=https://api.duhitadental.com` on the VPS build, deploy via Coolify.

> Secrets live only in `backend/.env` / `ai-server/.env` on the VPS and locally. Never commit them.
