import pytest
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_document_upload_and_lifecycle():
    # 1. Upload a markdown file
    md_content = b"# Operating Systems\nLinux uses monolithic kernels. Raspberry Pi OS is based on Debian.\n\n# Networking\nLocal Area Networks operate within private subnets like 192.168.1.0/24."
    files = {"file": ("os_notes.md", io.BytesIO(md_content), "text/markdown")}
    
    res = client.post("/api/documents/upload", files=files)
    assert res.status_code == 201
    doc = res.json()
    doc_id = doc["id"]
    assert doc["filename"] == "os_notes.md"
    assert doc["file_type"] == "md"
    assert doc["status"] in ("uploaded", "processing", "indexed")

    # 2. Retrieve document
    res_get = client.get(f"/api/documents/{doc_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == doc_id

    # 3. List documents
    res_list = client.get("/api/documents")
    assert res_list.status_code == 200
    assert any(d["id"] == doc_id for d in res_list.json())

    # 4. Delete document
    res_del = client.delete(f"/api/documents/{doc_id}")
    assert res_del.status_code == 204

    # 5. Verify deleted
    res_verify = client.get(f"/api/documents/{doc_id}")
    assert res_verify.status_code == 404
