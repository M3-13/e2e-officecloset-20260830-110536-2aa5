from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.db import Base, get_db
from app.main import app
from app.models import User, WardrobeItem
from app.security import get_current_user


@pytest.fixture()
def session_factory() -> Iterator[sessionmaker[Session]]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    yield factory
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture()
def user_ids(session_factory: sessionmaker[Session]) -> tuple[int, int]:
    db = session_factory()
    alice = User(email="alice@example.com", hashed_password="x")
    bob = User(email="bob@example.com", hashed_password="x")
    db.add_all([alice, bob])
    db.commit()
    db.refresh(alice)
    db.refresh(bob)
    result = (alice.id, bob.id)
    db.close()
    return result


def _as_user(user_id: int) -> None:
    def override() -> User:
        return User(id=user_id, email=f"user{user_id}@example.com", hashed_password="x")

    app.dependency_overrides[get_current_user] = override


def test_create_item_returns_201_and_owned(client: TestClient, user_ids: tuple[int, int]) -> None:
    alice_id, _ = user_ids
    _as_user(alice_id)

    response = client.post("/api/wardrobe", json={"name": "Abendkleid", "category": "Kleider"})

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Abendkleid"
    assert body["category"] == "Kleider"
    assert body["image_filename"] is None
    assert body["id"] > 0


def test_create_item_invalid_category_returns_422(
    client: TestClient, user_ids: tuple[int, int]
) -> None:
    alice_id, _ = user_ids
    _as_user(alice_id)

    response = client.post("/api/wardrobe", json={"name": "X", "category": "Hüte"})

    assert response.status_code == 422


def test_list_isolates_users(client: TestClient, user_ids: tuple[int, int]) -> None:
    alice_id, bob_id = user_ids

    _as_user(alice_id)
    alice_resp = client.post("/api/wardrobe", json={"name": "Alice Kleid", "category": "Kleider"})
    alice_item_id = alice_resp.json()["id"]

    _as_user(bob_id)
    bob_resp = client.post("/api/wardrobe", json={"name": "Bob Hose", "category": "Hosen"})
    bob_item_id = bob_resp.json()["id"]

    _as_user(alice_id)
    alice_list = client.get("/api/wardrobe").json()
    assert [item["id"] for item in alice_list] == [alice_item_id]

    _as_user(bob_id)
    bob_list = client.get("/api/wardrobe").json()
    assert [item["id"] for item in bob_list] == [bob_item_id]


def test_get_foreign_item_returns_404(client: TestClient, user_ids: tuple[int, int]) -> None:
    alice_id, bob_id = user_ids

    _as_user(alice_id)
    item_id = client.post("/api/wardrobe", json={"name": "Geheim", "category": "Schuhe"}).json()[
        "id"
    ]

    _as_user(bob_id)
    response = client.get(f"/api/wardrobe/{item_id}")
    assert response.status_code == 404


def test_get_missing_item_returns_404(client: TestClient, user_ids: tuple[int, int]) -> None:
    alice_id, _ = user_ids
    _as_user(alice_id)

    response = client.get("/api/wardrobe/999999")
    assert response.status_code == 404


def test_update_own_item(client: TestClient, user_ids: tuple[int, int]) -> None:
    alice_id, _ = user_ids
    _as_user(alice_id)
    item_id = client.post("/api/wardrobe", json={"name": "Alt", "category": "Hosen"}).json()["id"]

    response = client.put(
        f"/api/wardrobe/{item_id}",
        json={"name": "Neu", "category": "Accessoires"},
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Neu"
    assert response.json()["category"] == "Accessoires"


def test_update_foreign_item_returns_404(client: TestClient, user_ids: tuple[int, int]) -> None:
    alice_id, bob_id = user_ids

    _as_user(alice_id)
    item_id = client.post("/api/wardrobe", json={"name": "Alt", "category": "Hosen"}).json()["id"]

    _as_user(bob_id)
    response = client.put(
        f"/api/wardrobe/{item_id}",
        json={"name": "Neu", "category": "Hosen"},
    )
    assert response.status_code == 404


def test_delete_own_item_returns_204(client: TestClient, user_ids: tuple[int, int]) -> None:
    alice_id, _ = user_ids
    _as_user(alice_id)
    item_id = client.post("/api/wardrobe", json={"name": "Weg", "category": "Schuhe"}).json()["id"]

    response = client.delete(f"/api/wardrobe/{item_id}")
    assert response.status_code == 204

    _as_user(alice_id)
    assert client.get(f"/api/wardrobe/{item_id}").status_code == 404


def test_delete_foreign_item_returns_404(client: TestClient, user_ids: tuple[int, int]) -> None:
    alice_id, bob_id = user_ids

    _as_user(alice_id)
    item_id = client.post("/api/wardrobe", json={"name": "Bleib", "category": "Schuhe"}).json()[
        "id"
    ]

    _as_user(bob_id)
    response = client.delete(f"/api/wardrobe/{item_id}")
    assert response.status_code == 404


def test_delete_with_image_calls_delete_image(
    client: TestClient,
    user_ids: tuple[int, int],
    session_factory: sessionmaker[Session],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    alice_id, _ = user_ids

    db = session_factory()
    item = WardrobeItem(
        name="MitBild",
        category="Kleider",
        image_filename="7.png",
        owner_id=alice_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    item_id = item.id
    db.close()

    calls: list[tuple[str, str]] = []
    monkeypatch.setattr("app.routers.wardrobe.delete_image", lambda d, f: calls.append((d, f)))

    _as_user(alice_id)
    response = client.delete(f"/api/wardrobe/{item_id}")
    assert response.status_code == 204
    assert calls == [(get_settings().upload_dir, "7.png")]


def test_delete_without_image_does_not_call_delete_image(
    client: TestClient,
    user_ids: tuple[int, int],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    alice_id, _ = user_ids
    _as_user(alice_id)
    item_id = client.post("/api/wardrobe", json={"name": "OhneBild", "category": "Hosen"}).json()[
        "id"
    ]

    calls: list[tuple[str, str]] = []
    monkeypatch.setattr("app.routers.wardrobe.delete_image", lambda d, f: calls.append((d, f)))

    _as_user(alice_id)
    response = client.delete(f"/api/wardrobe/{item_id}")
    assert response.status_code == 204
    assert calls == []
