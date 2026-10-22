import re
import uuid
from pathlib import Path
from typing import Tuple
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security_bearer = HTTPBearer(auto_error=False)

def sanitize_filename(filename: str) -> str:
    """
    Strips directory separators and risky characters, preserving base filename.
    """
    # Remove any directory traversal path elements
    clean_name = Path(filename).name
    # Keep only alphanumeric, dash, underscore, dot
    clean_name = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', clean_name)
    # Prevent hidden files
    clean_name = clean_name.lstrip('.')
    if not clean_name:
        clean_name = "document"
    return clean_name

def generate_safe_storage_name(original_filename: str) -> Tuple[str, str, str]:
    """
    Generates a unique document ID, a safe storage filename, and preserves display name.
    Returns: (doc_id, safe_stored_filename, display_name)
    """
    doc_id = str(uuid.uuid4())
    safe_name = sanitize_filename(original_filename)
    extension = Path(safe_name).suffix.lower()
    stored_name = f"{doc_id}{extension}"
    return doc_id, stored_name, safe_name

def validate_file_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed extensions: {', '.join(settings.allowed_extensions)}"
        )
    return ext

def verify_lan_auth(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> bool:
    """
    Verifies LAN token if lan_auth_enabled is set in settings.
    """
    if not settings.lan_auth_enabled:
        return True
    
    if not settings.lan_auth_token:
        return True
        
    if not credentials or credentials.credentials != settings.lan_auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return True

def sanitize_rag_chunk(text: str) -> str:
    """
    Neutralizes attempts to escape context boundaries or execute prompt injection.
    """
    # Strip null bytes and unusual control chars
    clean = text.replace("\x00", "").strip()
    return clean
