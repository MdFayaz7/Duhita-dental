# Duhita Dental — project notes

Four parts in this repo:

| Folder | What it is | Production host |
|---|---|---|
| `duhita-frontend/` | React + Vite + Tailwind website, admin dashboard at `/admin` | `duhitadental.com` (port 80) |
| `backend/` | FastAPI + PostgreSQL API (SQLAlchemy async, Alembic) | `api.duhitadental.com` (port 8000) |
| `ai-server/` | Duhita AI (talking assistant + voice) | `ai.duhitadental.com` (port 8787) |
| `patient-app/` | Expo / React Native patient app | n/a — distributed via EAS/app stores |

## Hosting: Hostinger VPS only

Everything deploys to one Hostinger VPS, managed through Coolify. **Vercel and Render are retired** —
their configs (`render.yaml`, `duhita-frontend/vercel.json`) and the Render keep-awake GitHub Action
were deliberately deleted. Don't recreate them or suggest deploying there again.

DNS lives in hPanel. The `www.ai.*` and `www.api.*` subdomains exist but are unused (nothing links to
them) — ignore their DNS-mismatch warnings, only the bare subdomains matter.

## Secrets

`backend/.env` and `ai-server/.env` are real, gitignored, and hold live credentials (DATABASE_URL, JWT
secret, Cloudinary key, WhatsApp token, etc). They are **not** in git and won't be in a zip/clone of this repo — recreate
them from the matching `.env.example` with real values, transferred out-of-band (AirDrop/USB), never
through git, chat, or email.

On the VPS itself, the backend's actual `CORS_ORIGINS` env var must include `https://duhitadental.com`
(and the `www.` variant) or the website's API calls get CORS-blocked.

## patient-app specifics

- Fallback API/site URLs are hardcoded in `src/lib/api.ts`, `src/lib/clinicApi.ts`, and
  `src/screens/SiteScreen.tsx` / `SiteScreen.web.tsx` — they point at the VPS domains above. Update all
  of them together if a domain ever changes.
- This project depends on `expo-dev-client`, so it needs a real development build — **plain Expo Go
  will fail to open it** ("Expo Go closed because this app has a bug" is the usual symptom). Build the
  dev client once via `eas build --profile development --platform android` (or `ios`), install that on
  the phone, then `npx expo start` works normally against it.
- `SiteScreen.tsx` injects CSS (`HIDE_SITE_CHROME`) to hide the website's header, WhatsApp bubble,
  quick-actions bar, and its floating "Ask Duhita AI" button — because the app already renders its own
  native equivalents (`ActionBar`, `AriaButton` in `App.tsx`). If `duhita-frontend/src/components/Layout.jsx`
  changes that button's `aria-label`, update the matching CSS selector here too, or the duplicate bot
  icon bug comes back.

## Backend specifics

- Postgres via SQLAlchemy 2.0 async + asyncpg. Schema lives in `backend/app/tables.py`; every change needs an
  Alembic revision (`alembic revision --autogenerate`), and the container runs `alembic upgrade head` on start.
- Uploaded files are rows in the `files` table (served at `/api/files/<id>`).
- New bookings WhatsApp the admins a Confirm button (Meta Cloud API, approved templates); confirming — by that
  button or the dashboard — WhatsApps the patient once. Setup and template text: `backend/README.md`.
- Tests need a real Postgres: `TEST_DATABASE_URL=... pytest` in `backend/`.
- Clinic hours are admin-editable per weekday (Settings → Clinic hours), stored in `settings` (`clinic_hours`) and served
  at `/api/clinic/hours` (`week`, Monday first; an empty day = closed / by appointment). `backend/app/clinic.py` holds the
  defaults (Mon–Sat 10:00–13:00 + 16:30–20:00, Sunday closed), slot length, durations and categories. The website booking
  page reads the API; `src/data/patients.js` / `site.js`, `index.html` (JSON-LD) and `patient-app/src/data/clinic.ts`
  still repeat the defaults as text.

## Admin calendar & patients

- `/admin/appointments` is a Practo-style calendar (`admin/Calendar.jsx`, `admin/CalendarBooking.jsx`): day view has a
  column per doctor, week view starts on Sunday, click a slot to book, drag to reschedule. The old table is at
  `/admin/appointments/list`. Doctors appear in the calendar when `in_calendar` is true (independent of `active`,
  which only controls the website) and are drawn in their `color`.
- Statuses: pending (website/app request) → confirmed (booked) → checked_in (waiting) → engaged → completed, plus
  cancelled / no_show. Booking or moving onto a doctor's occupied time returns 409 unless `force` is sent.
- Families: there is no family table. Patients who share a mobile number are a family (`family_size` in the list,
  `family` in the detail). Every member keeps their own patient ID.
- Practo import (`/admin/patients/import`, `app/practo_import.py`, `routers/patients_import.py`): preview then commit,
  stateless (the file is sent twice). Matches by Practo number, then mobile + name; only fills blanks, never
  overwrites, so re-importing is safe. New IDs use the Practo registration month (`DDyymm-nnnn`).

## Patient section (Practo EMR)

- `/admin/patients` is `admin/patient/PatientSection.jsx`: Practo's groups + patient cards, and per patient a left menu
  (Profile, Appointments, Communications, Vital Signs, Clinical Notes, Treatment Plans, Completed Procedures, Files,
  Prescriptions, Timeline, Invoices, Payments, Ledger, Past Bills). `/admin/patients/all/<section>` lists a section across
  patients; the old table is `/admin/patients/table`.
- API in `routers/emr.py`: generic CRUD at `/api/emr/{vitals,notes,treatments,prescriptions}`, pick lists `/api/emr/terms`
  (new note terms are learnt automatically), merge, profile PATCH, communications. A treatment is a plan line until
  `completed`; billing it sets `invoice_items.treatment_id`, and completed procedures = completed treatments + invoice lines
  without a treatment.
- SHARE ON/OFF (per section, `extra["share"]`, default on, `app/sharing.py`) decides what appears in the patient app
  (`/api/app/me/health`, "From the clinic" on the Profile screen). Only that patient's own entries are ever returned —
  family members on the same mobile number never see each other's records or bookings.

## Practo archive

- Practo's four exports (patients, treatments, invoices, payments) live in separate `practo_*` tables keyed by Practo's own
  patient number, apart from the live patients. Upload them at Patients → Practo Patients → "Import Practo data"
  (`POST /api/practo/import`, `app/practo_archive.py`); each file replaces its table, so re-uploading is safe.
  `/admin/patients/practo/<number>` shows that patient's Practo history (read only). Rows with a blank/unknown patient
  number are matched by exact name only when exactly one Practo patient has that name.
- The exports are real patient data: keep them in `practo-data/` (gitignored), never commit, paste or send them.
- New patient IDs are `DDC<yymmdd><N>`, N restarting at 1 each month (`add_patient` in `patients_service.py`); older
  `DDyymm-nnnn` IDs stay valid.

## Billing

- Tables `procedures` (fee list), `invoices` + `invoice_items`, `payments` — money is NUMERIC(12,2)/Decimal throughout.
  Totals are computed server-side in `app/billing.py` and cached on the invoice (`subtotal/discount/tax/total/paid`);
  the admin's live preview in `admin/billingUi.jsx` mirrors the same formula (tax applies after discount).
- Bill numbers are unique and editable; blank = max + 1 under an advisory lock. Cancelling keeps the number used;
  invoices with payments can't be cancelled, deleted or reduced below the amount received. Patients with invoices
  can't be deleted.
- Screens: `/admin/patients/:id` (timeline / invoices / payments), `/admin/patients/:id/invoices/new` and
  `/admin/invoices/:id/edit` (Practo-style editor with FDI teeth chart), `/admin/billing` (invoice list, fee list),
  `/admin/print/invoice/:id` (A4 printout, opens the print dialog; letterhead from `src/data/site.js`).

