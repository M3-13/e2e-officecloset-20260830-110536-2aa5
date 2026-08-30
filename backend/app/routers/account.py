from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.security import get_current_user
from app.storage import delete_image

bearer = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/api/auth", tags=["account"])


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> None:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_current_user(credentials, db)

    upload_dir = get_settings().upload_dir
    for item in user.wardrobe_items:
        delete_image(upload_dir, item.image_filename)

    db.delete(user)
    db.commit()
