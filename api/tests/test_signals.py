"""Needs a Postgres with db/migrations/003_community.sql applied and a spots(id, status) table.
Run with TEST_DATABASE_URL=postgresql+psycopg2://user@host:port/db pytest tests/test_signals.py
Skipped when TEST_DATABASE_URL is not set, so the normal test run is unaffected."""
import io
import os

import pytest

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")

if URL:
    os.environ["DATABASE_URL"] = URL
    from fastapi.testclient import TestClient
    from sqlalchemy import text

    from app.db import SessionLocal
    from app.main import app
    from app.storage import backup_photo, restore_photo


@pytest.fixture()
def client():
    db = SessionLocal()
    db.execute(text("TRUNCATE spot_signals, photos, audit_log"))
    db.execute(text("DELETE FROM spots"))
    db.execute(text("INSERT INTO spots (id, status) VALUES (1, 'open'), (2, 'cleaned')"))
    db.commit()
    db.close()
    return TestClient(app)


def dev(n):  # a valid 16+ char device id
    return {"device": f"device-number-{n:04d}"}


def test_seen_counts_each_device_once(client):
    assert client.post("/api/v1/public/spots/1/seen", json=dev(1)).json()["seen_count"] == 1
    assert client.post("/api/v1/public/spots/1/seen", json=dev(1)).json()["seen_count"] == 1  # same device again
    assert client.post("/api/v1/public/spots/1/seen", json=dev(2)).json()["seen_count"] == 2


def test_same_device_can_do_both_signals(client):
    client.post("/api/v1/public/spots/1/seen", json=dev(1))
    r = client.post("/api/v1/public/spots/1/not-garbage", json=dev(1)).json()
    assert r["seen_count"] == 1 and r["not_garbage_count"] == 1


def test_three_devices_dispute_an_open_spot(client):
    for n in (1, 2):
        r = client.post("/api/v1/public/spots/1/not-garbage", json=dev(n)).json()
        assert r["disputed"] is False
    r = client.post("/api/v1/public/spots/1/not-garbage", json=dev(3)).json()
    assert r["disputed"] is True
    db = SessionLocal()
    assert db.execute(text("SELECT status FROM spots WHERE id=1")).scalar() == "disputed"
    assert db.execute(text("SELECT count(*) FROM audit_log WHERE action='disputed_by_public'")).scalar() == 1
    db.close()


def test_cleaned_spot_is_not_disputed(client):
    for n in (1, 2, 3, 4):
        r = client.post("/api/v1/public/spots/2/not-garbage", json=dev(n)).json()
    assert r["disputed"] is False
    db = SessionLocal()
    assert db.execute(text("SELECT status FROM spots WHERE id=2")).scalar() == "cleaned"
    db.close()


def test_rejects_bad_input(client):
    assert client.post("/api/v1/public/spots/99/seen", json=dev(1)).status_code == 404
    assert client.post("/api/v1/public/spots/1/seen", json={"device": "short"}).status_code == 422
    assert client.post("/api/v1/public/spots/1/seen", json={"device": "bad chars!!!!!!!!!!!!"}).status_code == 422
    assert client.post("/api/v1/public/spots/1/seen", json={}).status_code == 422


def test_device_id_is_stored_only_as_a_hash(client):
    client.post("/api/v1/public/spots/1/seen", json=dev(7))
    db = SessionLocal()
    h = db.execute(text("SELECT device_hash FROM spot_signals")).scalar()
    db.close()
    assert "device-number" not in h and len(h) == 64


def test_photo_survives_a_disk_wipe(client, tmp_path):
    path = str(tmp_path / "reports" / "a.jpg")
    os.makedirs(os.path.dirname(path))
    open(path, "wb").write(b"\xff\xd8photo-bytes")
    backup_photo(path, b"\xff\xd8photo-bytes")
    os.remove(path)  # what a Render restart does
    assert restore_photo(path) is True
    assert open(path, "rb").read() == b"\xff\xd8photo-bytes"
    assert restore_photo(str(tmp_path / "reports" / "missing.jpg")) is False


def test_media_route_serves_restored_photo_and_blocks_traversal(client, tmp_path, monkeypatch):
    from app import main
    monkeypatch.setattr(main.settings, "storage_dir", str(tmp_path))
    path = str(tmp_path / "reports" / "b.jpg")
    os.makedirs(os.path.dirname(path))
    backup_photo(path, b"abc123")
    assert client.get("/media/reports/b.jpg").content == b"abc123"  # not on disk: comes from the database
    assert client.get("/media/../../etc/passwd").status_code in (404, 422)
    assert client.get("/media/reports/nope.jpg").status_code == 404
