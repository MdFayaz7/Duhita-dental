# Duhita Dental — Backend API

FastAPI + MongoDB backend for the website and the admin dashboard.

## Setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then paste your Mongo URI and set a password
python -m app.seed --gallery  # admin user + doctor + existing gallery images
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

## What is stored

| Collection     | Purpose                                                    |
|----------------|------------------------------------------------------------|
| `admins`       | Dashboard login (bcrypt hashed passwords)                    |
| `patients`     | New patient registrations, each with a `DDyymm-nnnn` ID      |
| `appointments` | Online bookings with status workflow                         |
| `schedule`     | The day's timed schedule table                               |
| `doctors`      | Doctor profiles shown on the site                            |
| `research`     | Research papers with uploaded PDFs                           |
| `gallery`      | Images by category: `clinic`, `infrastructure`, `camps`      |

Uploaded files live in `backend/uploads/` and are served from `/uploads/...`.

## Public endpoints (no login)

- `POST /api/patients` — register a patient, returns the new patient ID
- `GET  /api/patients/lookup/{patient_id}` — fills the booking form
- `POST /api/appointments` — request an appointment
- `GET  /api/doctors`, `GET /api/research`, `GET /api/gallery?category=clinic`, `GET /api/feedback`
- `GET  /api/files/{id}` — stored photos, PDFs and videos (supports byte ranges for video streaming)
- `GET  /api/health`

## Admin endpoints (Bearer token from `POST /api/auth/login`)

- Appointments: list / filter, `PATCH` status, delete
- Schedule: list by date, add, `copy-appointments`, edit, delete
- Doctors, Research, Gallery: full create / update / delete, with file uploads
- `GET /api/stats/overview` for the dashboard cards

## Security notes

- Change `ADMIN_PASSWORD` and `JWT_SECRET` in `.env` before going live.
- Tokens expire after `JWT_EXPIRE_MINUTES` (default 12 hours).
- `CORS_ORIGINS` must list the exact site URLs; do not use `*` in production.
- Serve over HTTPS in production so the login password is never sent in clear text.
