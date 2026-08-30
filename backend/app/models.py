from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)

    wardrobe_items: Mapped[list["WardrobeItem"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )


class WardrobeItem(Base):
    __tablename__ = "wardrobe_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)
    image_filename: Mapped[str | None] = mapped_column(String, nullable=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    owner: Mapped["User"] = relationship(back_populates="wardrobe_items")
