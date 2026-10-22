import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_conversation_lifecycle():
    # 1. Create conversation
    res = client.post("/api/conversations", json={"title": "Test Chat", "model": "test-model"})
    assert res.status_code == 201
    data = res.json()
    conv_id = data["id"]
    assert data["title"] == "Test Chat"

    # 2. List conversations
    res_list = client.get("/api/conversations")
    assert res_list.status_code == 200
    convs = res_list.json()
    assert any(c["id"] == conv_id for c in convs)

    # 3. Update conversation
    res_update = client.patch(f"/api/conversations/{conv_id}", json={"title": "Updated Title"})
    assert res_update.status_code == 200
    assert res_update.json()["title"] == "Updated Title"

    # 4. Search conversations
    res_search = client.get("/api/conversations/search?q=Updated")
    assert res_search.status_code == 200
    assert any(c["id"] == conv_id for c in res_search.json())

    # 5. Delete conversation
    res_del = client.delete(f"/api/conversations/{conv_id}")
    assert res_del.status_code == 204

    # 6. Verify deleted
    res_get = client.get(f"/api/conversations/{conv_id}")
    assert res_get.status_code == 404
