from fastapi import APIRouter, Depends, HTTPException, status

from ..config import settings
from ..db import get_db
from ..models import LoginIn, Token
from ..security import create_access_token, current_admin, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(payload: LoginIn):
    db = get_db()
    admin = await db.admins.find_one({"username": payload.username})

    # First run: create the admin from .env so there is always a way in.
    if not admin and payload.username == settings.admin_username:
        admin = {"username": settings.admin_username, "password": hash_password(settings.admin_password)}
        await db.admins.insert_one(dict(admin))

    if not admin or not verify_password(payload.password, admin["password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password.")

    return Token(access_token=create_access_token(payload.username), username=payload.username)


@router.get("/me")
async def me(username: str = Depends(current_admin)):
    return {"username": username}


@router.post("/change-password")
async def change_password(payload: LoginIn, username: str = Depends(current_admin)):
    """payload.username is ignored; password is the new one."""
    if len(payload.password) < 8:
        raise HTTPException(400, "Use at least 8 characters.")
    await get_db().admins.update_one(
        {"username": username}, {"$set": {"password": hash_password(payload.password)}}, upsert=True
    )
    return {"ok": True}
