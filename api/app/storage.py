import os
import uuid

from fastapi import UploadFile

from .config import settings


def save_upload(file: UploadFile, subdir: str) -> str:
    """Save an uploaded photo; originals are evidence, never overwritten."""
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    folder = os.path.join(settings.storage_dir, subdir)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{uuid.uuid4().hex}{ext}")
    with open(path, "wb") as f:
        f.write(file.file.read())
    return path
