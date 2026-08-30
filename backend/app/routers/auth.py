import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

RATE_LIMIT = 5
RATE_WINDOW_SECONDS = 60
_MAX_TRACKED_IPS = 10_000

_rate_lock = threading.Lock()
_rate_buckets: dict[str, list[float]] = {}


def _reset_rate_limiter() -> None:
    with _rate_lock:
        _rate_buckets.clear()


def _client_ip(request: Request) -> str:
    if request.client is not None:
        return request.client.host
    return "unknown"


def _rate_limited(ip: str) -> bool:
    now = time.monotonic()
    with _rate_lock:
        bucket = _rate_buckets.get(ip)
        if bucket is None:
            bucket = []
            _rate_buckets[ip] = bucket
        else:
            bucket[:] = [t for t in bucket if now - t < RATE_WINDOW_SECONDS]

        if len(bucket) >= RATE_LIMIT:
            return True

        bucket.append(now)

        if len(_rate_buckets) > _MAX_TRACKED_IPS:
            for key in list(_rate_buckets):
                if not _rate_buckets[key]:
                    del _rate_buckets[key]
        return False


@router.post("/register", status_code=201, response_model=TokenResponse)
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    if _rate_limited(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many requests")

    email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> TokenResponse:
    if _rate_limited(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many requests")

    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/logout", status_code=204)
def logout() -> Response:
    return Response(status_code=204)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return current_user
