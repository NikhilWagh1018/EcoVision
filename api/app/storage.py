import logging
import mimetypes
import os
import uuid

from fastapi import UploadFile
from sqlalchemy import text

from .config import settings

log = logging.getLogger("storage")


def save_upload(file: UploadFile, subdir: str) -> str:
    """Save an uploaded photo; originals are evidence, never overwritten.

    The file goes on disk (fast, used by the image checks) and a copy goes in the database, because the
    free Render plan wipes its disk on every restart. The copy is best effort: if migration 003 has not
    been run, the upload still works.
    """
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    folder = os.path.join(settings.storage_dir, subdir)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{uuid.uuid4().hex}{ext}")
    data = file.file.read()
    with open(path, "wb") as f:
        f.write(data)
    backup_photo(path, data)
    return path


def backup_photo(path: str, data: bytes) -> None:
    from .db import SessionLocal  # local import: db.py reads settings at import time

    db = SessionLocal()
    try:
        ctype = mimetypes.guess_type(path)[0] or "image/jpeg"
        db.execute(text("INSERT INTO photos (path, content_type, data) VALUES (:p, :c, :d) ON CONFLICT (path) DO NOTHING"),
                   {"p": os.path.realpath(path), "c": ctype, "d": data})
        db.commit()
    except Exception as e:  # noqa: BLE001 - never fail an upload because the backup failed
        db.rollback()
        log.warning("photo backup skipped for %s: %s", path, e)
    finally:
        db.close()


def restore_photo(path: str) -> bool:
    """Put a photo back on disk from its database copy. True when the file is on disk afterwards."""
    if os.path.exists(path):
        return True
    from .db import SessionLocal

    db = SessionLocal()
    try:
        row = db.execute(text("SELECT data FROM photos WHERE path = :p"), {"p": os.path.realpath(path)}).first()
    except Exception as e:  # noqa: BLE001
        log.warning("photo restore failed for %s: %s", path, e)
        return False
    finally:
        db.close()
    if not row:
        return False
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(bytes(row[0]))
    return True
