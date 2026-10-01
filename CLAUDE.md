# Duhita Dental — project notes

Four parts in this repo:

| Folder | What it is | Production host |
|---|---|---|
| `duhita-frontend/` | React + Vite + Tailwind website, admin dashboard at `/admin` | `duhitadental.com` (port 80) |
| `backend/` | FastAPI + MongoDB API | `api.duhitadental.com` (port 8000) |
| `ai-server/` | Duhita AI (talking assistant + voice) | `ai.duhitadental.com` (port 8787) |
| `patient-app/` | Expo / React Native patient app | n/a — distributed via EAS/app stores |

## Hosting: Hostinger VPS only

Everything deploys to one Hostinger VPS, managed through Coolify. **Vercel and Render are retired** —
their configs (`render.yaml`, `duhita-frontend/vercel.json`) and the Render keep-awake GitHub Action
were deliberately deleted. Don't recreate them or suggest deploying there again.

DNS lives in hPanel. The `www.ai.*` and `www.api.*` subdomains exist but are unused (nothing links to
them) — ignore their DNS-mismatch warnings, only the bare subdomains matter.

## Secrets

`backend/.env` and `ai-server/.env` are real, gitignored, and hold live credentials (Mongo URI, JWT
secret, Cloudinary key, etc). They are **not** in git and won't be in a zip/clone of this repo — recreate
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
