from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import User, WardrobeItem
from app.schemas import WardrobeItemCreate, WardrobeItemResponse, WardrobeItemUpdate
from app.security import get_current_user
from app.storage import delete_image

router = APIRouter(prefix="/api/wardrobe", tags=["wardrobe"])


def _get_owned_item(db: Session, item_id: int, owner_id: int) -> WardrobeItem:
    item = db.get(WardrobeItem, item_id)
    if item is None or item.owner_id != owner_id:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get("", response_model=list[WardrobeItemResponse])
def list_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WardrobeItem]:
    stmt = (
        select(WardrobeItem)
        .where(WardrobeItem.owner_id == current_user.id)
        .order_by(WardrobeItem.id)
    )
    return list(db.scalars(stmt))


@router.post("", response_model=WardrobeItemResponse, status_code=201)
def create_item(
    payload: WardrobeItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WardrobeItem:
    item = WardrobeItem(
        name=payload.name,
        category=payload.category.value,
        owner_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=WardrobeItemResponse)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WardrobeItem:
    return _get_owned_item(db, item_id, current_user.id)


@router.put("/{item_id}", response_model=WardrobeItemResponse)
def update_item(
    item_id: int,
    payload: WardrobeItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WardrobeItem:
    item = _get_owned_item(db, item_id, current_user.id)
    item.name = payload.name
    item.category = payload.category.value
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    item = _get_owned_item(db, item_id, current_user.id)
    if item.image_filename:
        delete_image(get_settings().upload_dir, item.image_filename)
    db.delete(item)
    db.commit()
    return Response(status_code=204)
