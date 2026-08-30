from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.models import User


def get_current_user(credentials: HTTPAuthorizationCredentials, db: Session) -> User:
    """Resolve the authenticated user from Bearer credentials.

    Signature skeleton: the auth ticket fills in the JWT verification body.
    """
    raise HTTPException(status_code=501, detail="auth ticket implements get_current_user")
