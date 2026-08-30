from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db import Base, get_db
from app.main import app
from app.models import User, WardrobeItem
from app.routers import account


@pytest.fixture
def session_factory(tmp_path: Path) -> sessionmaker[Session]:
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)


@pytest.fixture
def upload_dir(tmp_path: Path) -> Path:
    directory = tmp_path / "uploads"
    directory.mkdir(parents=True, exist_ok=True)
    return directory


@pytest.fixture
def client(
    session_factory: sessionmaker[Session], upload_dir: Path, monkeypatch: pytest.MonkeyPatch
):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(
        account, "get_settings", lambda: SimpleNamespace(upload_dir=str(upload_dir))
    )
    yield TestClient(app)
    app.dependency_overrides.clear()


def _provision_user(session_factory: sessionmaker[Session], email: str) -> int:
    with session_factory() as db:
        user = User(email=email, hashed_password="hashed-secret")
        db.add(user)
        db.commit()
        db.refresh(user)
        return user.id


def _authenticate(monkeypatch: pytest.MonkeyPatch, user_id: int) -> None:
    def fake_get_current_user(credentials: object, db: Session) -> User:
        user = db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user

    monkeypatch.setattr(account, "get_current_user", fake_get_current_user)


def test_delete_account_unauthenticated_returns_401(client: TestClient) -> None:
    response = client.delete("/api/auth/account")
    assert response.status_code == 401


def test_delete_account_removes_user_items_and_images(
    client: TestClient,
    session_factory: sessionmaker[Session],
    upload_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = _provision_user(session_factory, "delete@example.com")

    image_file = upload_dir / "42.png"
    image_file.write_bytes(b"fake-image-bytes")

    with session_factory() as db:
        db.add(
            WardrobeItem(
                name="Dress", category="Kleider", image_filename="42.png", owner_id=user_id
            )
        )
        db.add(WardrobeItem(name="Shoes", category="Schuhe", image_filename=None, owner_id=user_id))
        db.commit()

    _authenticate(monkeypatch, user_id)

    response = client.delete("/api/auth/account", headers={"Authorization": "Bearer test-token"})
    assert response.status_code == 204

    assert not image_file.exists()

    with session_factory() as db:
        assert db.get(User, user_id) is None
        assert db.query(WardrobeItem).filter_by(owner_id=user_id).count() == 0


def test_account_deletion_invalidates_existing_token(
    client: TestClient,
    session_factory: sessionmaker[Session],
    upload_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = _provision_user(session_factory, "gone@example.com")
    _authenticate(monkeypatch, user_id)

    first = client.delete("/api/auth/account", headers={"Authorization": "Bearer test-token"})
    assert first.status_code == 204

    second = client.delete("/api/auth/account", headers={"Authorization": "Bearer test-token"})
    assert second.status_code == 401

    with session_factory() as db:
        assert db.query(User).filter_by(email="gone@example.com").first() is None
