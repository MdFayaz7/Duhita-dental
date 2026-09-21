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

> Secrets live only in `backend/.env`, which is git-ignored. Never commit it.
