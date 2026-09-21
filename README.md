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

### 1. MongoDB Atlas
Network Access → **Add IP Address → Allow access from anywhere (0.0.0.0/0)**. Render's free tier has no fixed IP, so this is required; keep a strong database password.

### 2. Backend on Render
1. Render dashboard → **New → Blueprint** → select this repo. It reads `render.yaml`.
2. When prompted, fill in:
   - `MONGO_URI` — your Atlas connection string
   - `ADMIN_PASSWORD` — the dashboard password
   - `CORS_ORIGINS` — your Vercel URL, e.g. `https://duhita-dental.vercel.app` (add it after step 3 if you don't know it yet)
3. Deploy, then open `https://<your-service>.onrender.com/api/health` — it should say `"database": "connected"`.
4. First deploy only, in the Render **Shell** tab: `python -m app.seed --gallery`

Uploaded photos and PDFs are stored in MongoDB (GridFS), so they survive Render restarts.

### 3. Frontend on Vercel
1. Vercel → **Add New → Project** → import this repo.
2. **Root Directory:** `duhita-frontend` (framework is detected as Vite).
3. **Environment Variable:** `VITE_API_URL` = your Render URL, e.g. `https://duhita-dental-api.onrender.com`
4. Deploy. Then copy the Vercel URL into Render's `CORS_ORIGINS` and redeploy the API.

> The free Render plan sleeps after 15 minutes idle; the first request after that takes ~30–50 seconds.

> Secrets live only in `backend/.env` locally and in the Render/Vercel dashboards. Never commit them.
