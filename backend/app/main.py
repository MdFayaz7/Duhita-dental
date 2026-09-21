from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pymongo.errors import PyMongoError

from .config import settings
from .db import ensure_indexes
from .routers import appointments, auth, doctors, files, gallery, patients, research, schedule, stats


@asynccontextmanager
async def lifespan(_: FastAPI):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    try:
        await ensure_indexes()
    except Exception as exc:  # the API should still boot if Mongo is briefly unreachable
        print(f"[startup] Mongo indexes not created: {exc}")
    yield


app = FastAPI(
    title="Duhita Dental API",
    description="Backend for the Duhita Multispeciality Dental Centre website and admin dashboard.",
    version="1.0.0",
    lifespan=lifespan,
)

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
    """Make CORS failures self-explaining in the server log; keep JSON reads fresh."""
    response = await call_next(request)
    path = request.url.path
    if request.method == "GET" and path.startswith("/api/") and not path.startswith("/api/files/"):
        # Admin edits must show up on the next page view — never serve a cached list.
        response.headers["Cache-Control"] = "no-store"
    if request.method == "OPTIONS" and response.status_code == 400:
        origin = request.headers.get("origin")
        print(f"[cors] rejected origin {origin!r} — add it to CORS_ORIGINS (allowed now: {settings.origins})")
    return response


app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

for router in (auth, patients, appointments, schedule, doctors, research, gallery, files, stats):
    app.include_router(router.router)


@app.exception_handler(PyMongoError)
async def mongo_error(_: Request, exc: PyMongoError):
    """Database problems should read clearly in the dashboard, not as a network error."""
    print(f"[mongo] {exc}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Database unavailable. Check MONGO_URI in backend/.env and that the IP is allowed in Atlas."},
    )


@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception):
    print(f"[error] {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong on the server. Please try again."})


@app.get("/api/health", tags=["health"])
async def health():
    from .db import get_db

    try:
        await get_db().command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok", "database": "connected" if db_ok else "unreachable"}
