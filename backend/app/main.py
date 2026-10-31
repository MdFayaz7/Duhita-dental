import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import InterfaceError, OperationalError

from . import events, whatsapp
from .config import settings
from .db import engine
from .routers import (
    appointments, auth, billing, calendar, doctors, emr, export, feedback, files, gallery, patient_app, patients, patients_import, practo,
    research, schedule, stats,
)
from .routers import whatsapp as whatsapp_router

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    yield
    await whatsapp.aclose()
    await engine.dispose()


app = FastAPI(
    title="Duhita Dental API",
    description="Backend for the Duhita Multispeciality Dental Centre website and admin dashboard.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_rejected_origins(request: Request, call_next):
    """Make CORS failures self-explaining in the server log; keep JSON reads fresh and static assets cached."""
    response = await call_next(request)
    path = request.url.path
    if request.method == "GET" and path.startswith("/api/") and not path.startswith("/api/files/"):
        # Admin edits must show up on the next page view — never serve a cached list.
        response.headers["Cache-Control"] = "no-store"
    elif request.method == "GET" and path.startswith("/uploads/"):
        response.headers["Cache-Control"] = "public, max-age=604800"

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"

    if request.method == "OPTIONS" and response.status_code == 400:
        origin = request.headers.get("origin")
        print(f"[cors] rejected origin {origin!r} — add it to CORS_ORIGINS (allowed now: {settings.origins})")
    return response


app.mount("/uploads", StaticFiles(directory=settings.upload_dir, check_dir=False), name="uploads")

for router in (events, auth, export, patients_import, practo, billing, emr, patients, calendar, appointments, schedule, doctors, research, gallery, feedback, files, stats,
               patient_app, whatsapp_router):
    app.include_router(router.router)


@app.exception_handler(OperationalError)
@app.exception_handler(InterfaceError)
@app.exception_handler(ConnectionError)
async def database_error(_: Request, exc: Exception):
    """Database problems should read clearly in the dashboard, not as a network error."""
    print(f"[db] {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Database unavailable. Check DATABASE_URL in backend/.env and that Postgres is running."},
    )


@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception):
    print(f"[error] {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server. Please try again."})


@app.get("/api/health", tags=["health"])
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok", "database": "connected" if db_ok else "unreachable"}
