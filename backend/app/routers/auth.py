from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from ..config import settings
from ..db import SessionDep
from ..models import LoginIn, Token
from ..security import create_access_token, current_admin, hash_password, verify_password
from ..tables import Admin

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(payload: LoginIn, session: SessionDep):
    password_hash = await session.scalar(select(Admin.password_hash).where(Admin.username == payload.username))

    # First run: create the admin from .env so there is always a way in.
    if password_hash is None and payload.username == settings.admin_username:
        password_hash = hash_password(settings.admin_password)
        await session.execute(insert(Admin).values(username=payload.username, password_hash=password_hash)
                              .on_conflict_do_nothing(index_elements=["username"]))
        await session.commit()

    if password_hash is None or not verify_password(payload.password, password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect username or password.")

    return Token(access_token=create_access_token(payload.username), username=payload.username)


@router.get("/me")
async def me(username: str = Depends(current_admin)):
    return {"username": username}


@router.post("/change-password")
async def change_password(payload: LoginIn, session: SessionDep, username: str = Depends(current_admin)):
    """payload.username is ignored; password is the new one."""
    if len(payload.password) < 8:
        raise HTTPException(400, "Use at least 8 characters.")
    new_hash = hash_password(payload.password)
    await session.execute(
        insert(Admin).values(username=username, password_hash=new_hash)
        .on_conflict_do_update(index_elements=["username"], set_={"password_hash": new_hash})
    )
    await session.commit()
    return {"ok": True}
