import os
from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import get_settings
from app.db import Base, get_db
from app.main import app
from app.routers import auth


@pytest.fixture(autouse=True)
def _jwt_secret() -> Generator[None]:
    os.environ["JWT_SECRET"] = "test-secret-key-for-tests-only-1234567890"
    get_settings.cache_clear()
    yield


@pytest.fixture()
def client() -> Generator[TestClient]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    auth._reset_rate_limiter()
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_register_returns_201_and_token(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "anna@example.com", "password": "secret123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert body["access_token"]


def test_login_returns_200_and_token(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"email": "anna@example.com", "password": "secret123"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "anna@example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]


def test_register_duplicate_email_returns_409(client: TestClient) -> None:
    payload = {"email": "dup@example.com", "password": "secret123"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 409


def test_login_wrong_password_returns_401(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"email": "anna@example.com", "password": "secret123"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "anna@example.com", "password": "wrong"},
    )
    assert response.status_code == 401


def test_login_unknown_email_returns_401(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "ghost@example.com", "password": "secret123"},
    )
    assert response.status_code == 401


def test_me_returns_current_user(client: TestClient) -> None:
    token = client.post(
        "/api/auth/register",
        json={"email": "anna@example.com", "password": "secret123"},
    ).json()["access_token"]
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "anna@example.com"
    assert isinstance(body["id"], int)


def test_me_without_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token_returns_401(client: TestClient) -> None:
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not-a-jwt"},
    )
    assert response.status_code == 401


def test_me_with_expired_token_returns_401(client: TestClient) -> None:
    secret = get_settings().jwt_secret
    past = datetime.now(UTC) - timedelta(hours=1)
    token = jwt.encode({"sub": "1", "exp": past}, secret, algorithm="HS256")
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_logout_returns_204(client: TestClient) -> None:
    response = client.post("/api/auth/logout")
    assert response.status_code == 204


def test_rate_limit_returns_429_after_five_requests(client: TestClient) -> None:
    payload = {"email": "nobody@example.com", "password": "wrong"}
    for _ in range(5):
        response = client.post("/api/auth/login", json=payload)
        assert response.status_code == 401
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 429
    assert response.json() == {"detail": "Too many requests"}
