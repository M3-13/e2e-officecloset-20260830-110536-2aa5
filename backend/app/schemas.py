from enum import StrEnum

from pydantic import BaseModel, ConfigDict


class Category(StrEnum):
    oberteile = "Oberteile"
    hosen = "Hosen"
    kleider = "Kleider"
    schuhe = "Schuhe"
    accessoires = "Accessoires"


class RegisterRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str


class WardrobeItemCreate(BaseModel):
    name: str
    category: Category


class WardrobeItemUpdate(BaseModel):
    name: str
    category: Category


class WardrobeItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: Category
    image_filename: str | None = None
