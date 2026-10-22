import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "Lucas"
    assert "ollama" in data
    assert "storage" in data

def test_ollama_status_endpoint():
    response = client.get("/api/ollama/status")
    assert response.status_code == 200
    data = response.json()
    assert "online" in data
    assert "base_url" in data
