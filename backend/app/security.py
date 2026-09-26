from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_patient_token(patient_id: str) -> str:
    """Token for the patient app. `kind` keeps it from ever passing as an admin token."""
    expire = datetime.now(timezone.utc) + timedelta(days=60)
    return jwt.encode({"sub": patient_id, "kind": "patient", "exp": expire},
                      settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


patient_scheme = OAuth2PasswordBearer(tokenUrl="/api/app/login", auto_error=False)


async def current_patient(token: str | None = Depends(patient_scheme)) -> str:
    """The signed-in patient's Patient ID, from their app token."""
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise error
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise error
    if payload.get("kind") != "patient" or not payload.get("sub"):
        raise error
    return payload["sub"]


async def current_admin(token: str = Depends(oauth2_scheme)) -> str:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session expired. Please sign in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise credentials_error
    username = payload.get("sub")
    if not username or payload.get("kind") == "patient":  # a patient token is never an admin
        raise credentials_error
    return username
