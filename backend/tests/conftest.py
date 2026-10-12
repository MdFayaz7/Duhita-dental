"""Tests run against a real Postgres: set TEST_DATABASE_URL to an empty, disposable database."""
import os

import pytest

TEST_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_URL:
    pytest.skip("TEST_DATABASE_URL is not set", allow_module_level=True)

os.environ.update(
    DATABASE_URL=TEST_URL,
    ADMIN_USERNAME="admin",
    ADMIN_PASSWORD="admin-pass-123",
    JWT_SECRET="test-secret",
    WHATSAPP_TOKEN="test-token",
    WHATSAPP_PHONE_NUMBER_ID="12345",
    WHATSAPP_APP_SECRET="app-secret",
    WHATSAPP_VERIFY_TOKEN="verify-me",
    WHATSAPP_ADMIN_NUMBERS="9440313066",
)

import httpx  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app import whatsapp  # noqa: E402
from app.db import engine  # noqa: E402
from app.main import app  # noqa: E402
from app.tables import Base  # noqa: E402

HERE = os.path.dirname(os.path.dirname(__file__))


@pytest.fixture(scope="session", autouse=True)
def schema():
    cfg = Config(os.path.join(HERE, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(HERE, "alembic"))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(autouse=True)
async def clean():
    tables = ", ".join(t.name for t in Base.metadata.sorted_tables)
    async with engine.begin() as conn:
        await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield


class FakeWhatsApp:
    """Stands in for graph.facebook.com and records what would have been sent."""

    def __init__(self):
        self.sent: list[dict] = []
        self.fail = False
        self.count = 0

    def handler(self, request: httpx.Request) -> httpx.Response:
        import json

        if self.fail:
            return httpx.Response(400, json={"error": {"message": "template not approved"}})
        self.sent.append(json.loads(request.content))
        self.count += 1
        return httpx.Response(200, json={"messages": [{"id": f"wamid.out{self.count}"}]})


@pytest.fixture
def wa(monkeypatch):
    fake = FakeWhatsApp()
    client = httpx.AsyncClient(transport=httpx.MockTransport(fake.handler), base_url="https://graph.test/")
    monkeypatch.setattr(whatsapp, "http_client", lambda: client)
    return fake


@pytest.fixture
async def client():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def admin(client):
    res = await client.post("/api/auth/login", json={"username": "admin", "password": "admin-pass-123"})
    assert res.status_code == 200, res.text
    client.headers["Authorization"] = f"Bearer {res.json()['access_token']}"
    return client
