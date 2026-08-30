import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import Settings
from app.db import Base, get_db
from app.main import app
from app.models import User, WardrobeItem
from app.routers import images

JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
WEBP = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 64


@pytest.fixture()
def env(tmp_path, monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    session_factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(images, "get_settings", lambda: Settings(upload_dir=str(tmp_path)))

    client = TestClient(app)
    yield SimpleNamespace(client=client, session_factory=session_factory, upload_dir=tmp_path)
    app.dependency_overrides.clear()


def _make_owner(env) -> User:
    db = env.session_factory()
    owner = User(email="owner@example.com", hashed_password="x")
    db.add(owner)
    db.commit()
    db.refresh(owner)
    db.close()
    return owner


def _make_item(env, owner: User, name: str = "Shirt") -> WardrobeItem:
    db = env.session_factory()
    item = WardrobeItem(name=name, category="Oberteile", owner_id=owner.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    db.close()
    return item


@pytest.mark.parametrize(
    ("payload", "expected_ext", "expected_media_type"),
    [
        (JPEG, "jpg", "image/jpeg"),
        (PNG, "png", "image/png"),
        (WEBP, "webp", "image/webp"),
    ],
)
def test_upload_valid_type_and_retrieve(
    env, payload: bytes, expected_ext: str, expected_media_type: str
) -> None:
    owner = _make_owner(env)
    item = _make_item(env, owner)
    app.dependency_overrides[images._current_user] = lambda: owner

    resp = env.client.post(
        f"/api/wardrobe/{item.id}/image",
        files={"file": (f"img.{expected_ext}", payload, expected_media_type)},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["image_filename"] == f"{item.id}.{expected_ext}"

    get = env.client.get(f"/api/wardrobe/{item.id}/image")
    assert get.status_code == 200
    assert get.headers["content-type"] == expected_media_type
    assert get.content == payload


def test_upload_wrong_type_returns_415(env) -> None:
    owner = _make_owner(env)
    item = _make_item(env, owner)
    app.dependency_overrides[images._current_user] = lambda: owner

    resp = env.client.post(
        f"/api/wardrobe/{item.id}/image",
        files={"file": ("notes.txt", b"definitely not an image", "text/plain")},
    )
    assert resp.status_code == 415
    assert "detail" in resp.json()


def test_upload_too_large_returns_413(env) -> None:
    owner = _make_owner(env)
    item = _make_item(env, owner)
    app.dependency_overrides[images._current_user] = lambda: owner

    big = b"\xff\xd8\xff" + b"\x00" * (5 * 1024 * 1024)
    resp = env.client.post(
        f"/api/wardrobe/{item.id}/image",
        files={"file": ("big.jpg", big, "image/jpeg")},
    )
    assert resp.status_code == 413
    assert "detail" in resp.json()


def test_read_upload_aborts_before_consuming_whole_body() -> None:
    boundary = "----OfficeClosetTestBoundary"
    preamble = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="big.jpg"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode("latin-1")
    footer = f"\r\n--{boundary}--\r\n".encode("latin-1")

    chunk = b"\x00" * (1024 * 1024)
    chunks = [preamble + b"\xff\xd8\xff"] + [chunk] * 6 + [footer]

    consumed = {"count": 0}

    async def stream():
        for c in chunks:
            consumed["count"] += 1
            yield c

    class FakeRequest:
        def __init__(self) -> None:
            self.headers = {"content-type": f"multipart/form-data; boundary={boundary}"}

        def stream(self):
            return stream()

    async def run() -> int | None:
        try:
            await images._read_upload(FakeRequest())
            return None
        except HTTPException as exc:
            return exc.status_code

    status = asyncio.run(run())
    assert status == 413
    # The parser must stop pulling chunks as soon as the 5 MB cap is exceeded.
    assert consumed["count"] < len(chunks)


def test_upload_rejects_foreign_item(env) -> None:
    owner = _make_owner(env)
    item = _make_item(env, owner)

    db = env.session_factory()
    other = User(email="other@example.com", hashed_password="x")
    db.add(other)
    db.commit()
    db.refresh(other)
    db.close()

    app.dependency_overrides[images._current_user] = lambda: other

    resp = env.client.post(
        f"/api/wardrobe/{item.id}/image",
        files={"file": ("a.jpg", JPEG, "image/jpeg")},
    )
    assert resp.status_code == 403
    assert "detail" in resp.json()


def test_retrieve_rejects_foreign_user(env) -> None:
    owner = _make_owner(env)
    item = _make_item(env, owner)
    app.dependency_overrides[images._current_user] = lambda: owner

    upload = env.client.post(
        f"/api/wardrobe/{item.id}/image",
        files={"file": ("a.jpg", JPEG, "image/jpeg")},
    )
    assert upload.status_code == 201

    db = env.session_factory()
    other = User(email="other@example.com", hashed_password="x")
    db.add(other)
    db.commit()
    db.refresh(other)
    db.close()
    app.dependency_overrides[images._current_user] = lambda: other

    resp = env.client.get(f"/api/wardrobe/{item.id}/image")
    assert resp.status_code in (401, 403, 404)


def test_retrieve_without_authentication_returns_401_or_403(env) -> None:
    owner = _make_owner(env)
    item = _make_item(env, owner)
    app.dependency_overrides[images._current_user] = lambda: owner

    upload = env.client.post(
        f"/api/wardrobe/{item.id}/image",
        files={"file": ("a.jpg", JPEG, "image/jpeg")},
    )
    assert upload.status_code == 201

    app.dependency_overrides.pop(images._current_user, None)
    resp = env.client.get(f"/api/wardrobe/{item.id}/image")
    assert resp.status_code in (401, 403)


def test_retrieve_missing_item_returns_404(env) -> None:
    owner = _make_owner(env)
    app.dependency_overrides[images._current_user] = lambda: owner

    resp = env.client.get("/api/wardrobe/999999/image")
    assert resp.status_code == 404


def test_content_length_precheck_returns_true_when_over_limit() -> None:
    class FakeRequest:
        def __init__(self, header: str | None) -> None:
            self.headers = {"content-length": header} if header is not None else {}

    assert images._content_length_too_large(FakeRequest(str(6 * 1024 * 1024))) is True
    assert images._content_length_too_large(FakeRequest(str(5 * 1024 * 1024))) is False
    assert images._content_length_too_large(FakeRequest("not-a-number")) is False
    assert images._content_length_too_large(FakeRequest(None)) is False
