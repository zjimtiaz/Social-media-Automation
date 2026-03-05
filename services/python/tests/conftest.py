import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import get_settings


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    settings = get_settings()
    return {"X-Service-Key": settings.service_key}
