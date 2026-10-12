# Duhita Dental — Backend API

FastAPI + PostgreSQL backend for the website, the admin dashboard and the patient app.

## Setup

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env          # set DATABASE_URL, admin password, JWT secret
alembic upgrade head          # create / update the schema
python -m app.seed --gallery  # admin user + doctor + existing gallery images
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs

## Database

| Table               | Purpose                                                        |
|---------------------|----------------------------------------------------------------|
| `admins`            | Dashboard login (bcrypt hashed passwords)                      |
| `patients`          | Registrations, each with a `DDyymm-nnnn` ID                    |
| `appointments`      | Bookings with status workflow and WhatsApp notification times  |
| `schedule`          | The day's timed schedule table                                 |
| `doctors`           | Doctor profiles shown on the site                              |
| `research`          | Research papers                                                |
| `gallery`           | Images by category: `clinic`, `infrastructure`, `camps`        |
| `feedback`          | Patient video clips                                            |
| `records`           | Prescriptions, X-rays and reports per patient                  |
| `files`             | Every uploaded photo, PDF and clip, served at `/api/files/<id>`|
| `whatsapp_messages` | Every WhatsApp message sent/received, with delivery status     |

Schema changes: edit `app/tables.py`, then

```bash
alembic revision --autogenerate -m "what changed"   # review the generated file
alembic upgrade head
```

The Docker image runs `alembic upgrade head` on every start, so deploys migrate themselves.

### Moving the old MongoDB data across (one time)

```bash
alembic upgrade head
MONGO_URI="mongodb+srv://..." MONGO_DB=duhita_dental python -m app.migrate_from_mongo --dry-run
MONGO_URI="mongodb+srv://..." MONGO_DB=duhita_dental python -m app.migrate_from_mongo
```

It copies every collection and every GridFS file in one transaction (all or nothing), keeps
file ids so existing `/api/files/...` links still work, and lists any document it had to skip.
Run the dry run first and read the report.

## WhatsApp booking confirmations

When a patient books (website or app), every number in `WHATSAPP_ADMIN_NUMBERS` gets a WhatsApp
message with a **Confirm** button. Tapping it confirms the appointment (the dashboard updates live)
and the patient gets a WhatsApp confirmation. Confirming from the dashboard sends the same patient
message. Each patient is messaged at most once per appointment, and a WhatsApp outage never blocks
a booking — failures are recorded in `whatsapp_messages`.

### One-time setup (Meta WhatsApp Cloud API)

1. In [Meta for Developers](https://developers.facebook.com/) create a **Business** app and add
   **WhatsApp**. Register the clinic's WhatsApp Business number (a number not already in use on the
   WhatsApp app).
2. Copy the **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`.
3. Business Settings → System users → create one, give it the app, and generate a **permanent
   token** with `whatsapp_business_messaging` → `WHATSAPP_TOKEN`.
4. App settings → Basic → **App secret** → `WHATSAPP_APP_SECRET`.
5. WhatsApp → Configuration → Webhook: callback URL `https://api.duhitadental.com/api/whatsapp/webhook`,
   verify token = any random string you also put in `WHATSAPP_VERIFY_TOKEN`. Subscribe to **messages**.
6. WhatsApp Manager → Message templates → create both templates below (category **Utility**,
   language **English**) and wait for approval.
7. Put the admins' mobile numbers in `WHATSAPP_ADMIN_NUMBERS`, redeploy.

**`appointment_request`** — body, then one *Quick reply* button labelled `Confirm`:

```
New appointment request at Duhita Dental.
Patient: {{1}}
Phone: {{2}}
Date: {{3}}
Time: {{4}}
Reason: {{5}}
Tap Confirm to confirm it and notify the patient.
```

**`appointment_confirmed`** — body only:

```
Hello {{1}}, your appointment at Duhita Multispeciality Dental Centre is confirmed for {{2}} at {{3}}. Shanthi Plaza, Benz Circle, Vijayawada. To reschedule, call +91 94403 13066.
```

Different template names can be set with `WHATSAPP_TEMPLATE_ADMIN` / `WHATSAPP_TEMPLATE_PATIENT`;
the variables must stay in this order.

## Public endpoints (no login)

- `POST /api/patients` — register a patient, returns the new patient ID
- `GET  /api/patients/lookup/{patient_id}` — fills the booking form
- `POST /api/appointments` — request an appointment
- `GET  /api/doctors`, `GET /api/research`, `GET /api/gallery?category=clinic`, `GET /api/feedback`
- `GET  /api/files/{id}` — stored photos, PDFs and videos (supports byte ranges for video streaming)
- `GET|POST /api/whatsapp/webhook` — Meta only (signature-checked)
- `GET  /api/health`

## Admin endpoints (Bearer token from `POST /api/auth/login`)

- Appointments: list / filter, `PATCH` status, delete
- Schedule: list by date, add, `copy-appointments`, edit, delete
- Doctors, Research, Gallery, Feedback: full create / update / delete, with file uploads
- `GET /api/stats/overview` for the dashboard cards

## Tests

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/duhita_test pytest
```

Use an empty, disposable database: the suite drops and recreates the schema.

## Security notes

- Change `ADMIN_PASSWORD` and `JWT_SECRET` in `.env` before going live.
- Tokens expire after `JWT_EXPIRE_MINUTES` (default 12 hours).
- `CORS_ORIGINS` must list the exact site URLs; do not use `*` in production.
- The WhatsApp webhook rejects any call not signed with `WHATSAPP_APP_SECRET`, and only taps from
  `WHATSAPP_ADMIN_NUMBERS` can confirm an appointment.
