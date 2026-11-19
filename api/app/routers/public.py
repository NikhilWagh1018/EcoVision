"""Read-only endpoints for the public map site. No login required."""
import hashlib
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from ..db import get_db

log = logging.getLogger("public")
router = APIRouter(prefix="/api/v1/public", tags=["public"])

SPOTS_BASE = """
SELECT s.id, ST_Y(s.location) AS lat, ST_X(s.location) AS lon, s.status,
       s.first_reported_at, w.name AS ward,
       (SELECT COALESCE(p.corrected_severity, p.severity)
          FROM reports r JOIN predictions p ON p.report_id = r.id
         WHERE r.spot_id = s.id ORDER BY r.captured_at DESC LIMIT 1) AS severity,
       {reps} AS representatives,
       {counts}
FROM spots s LEFT JOIN wards w ON w.id = s.ward_id
ORDER BY s.id DESC LIMIT 2000
"""

COUNTS = """(SELECT count(*) FROM spot_signals g WHERE g.spot_id = s.id AND g.kind = 'seen') AS seen_count,
       (SELECT count(*) FROM spot_signals g WHERE g.spot_id = s.id AND g.kind = 'not_garbage') AS not_garbage_count"""
NO_COUNTS = "0 AS seen_count, 0 AS not_garbage_count"

# This many different devices saying "not garbage" moves an open spot to 'disputed' for a human to review.
DISPUTE_AFTER = 3

REPS = """COALESCE((SELECT json_agg(json_build_object(
              'name', rp.name, 'role', rp.role, 'constituency', rp.constituency))
          FROM ward_representatives wr JOIN representatives rp ON rp.id = wr.representative_id
         WHERE wr.ward_id = s.ward_id), '[]'::json)"""


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    row = db.execute(text(
        """SELECT count(*) FILTER (WHERE status <> 'cleaned') AS open_spots,
                  count(*) FILTER (WHERE status = 'cleaned') AS cleaned_spots,
                  count(*) AS total_spots,
                  (SELECT count(*) FROM cleanups WHERE verdict = 'clean') AS verified_cleanups
           FROM spots""")).mappings().one()
    return dict(row)


@router.get("/spots")
def public_spots(db: Session = Depends(get_db)):
    # Newer tables may not exist yet (migrations 002 and 003): fall back so the map keeps working.
    attempts = [(REPS, COUNTS), (REPS, NO_COUNTS), ("'[]'::json", NO_COUNTS)]
    for i, (reps, counts) in enumerate(attempts):
        try:
            rows = db.execute(text(SPOTS_BASE.format(reps=reps, counts=counts))).mappings().all()
            break
        except ProgrammingError as e:
            db.rollback()
            if i == len(attempts) - 1:
                raise
            log.warning("optional tables missing, retrying without them: %s", e.orig)
    return [dict(r) for r in rows]


class Signal(BaseModel):
    # A random id the browser creates for itself and keeps. Only its hash is stored.
    device: str = Field(min_length=16, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")


def _signal(db: Session, spot_id: int, kind: str, device: str) -> dict:
    if not db.execute(text("SELECT 1 FROM spots WHERE id = :i"), {"i": spot_id}).first():
        raise HTTPException(404, "spot not found")
    digest = hashlib.sha256(f"ecovision:{device}".encode()).hexdigest()
    try:
        db.execute(text(
            "INSERT INTO spot_signals (spot_id, kind, device_hash) VALUES (:s, :k, :d) ON CONFLICT DO NOTHING"),
            {"s": spot_id, "k": kind, "d": digest})
        counts = db.execute(text(
            """SELECT count(*) FILTER (WHERE kind = 'seen') AS seen_count,
                      count(*) FILTER (WHERE kind = 'not_garbage') AS not_garbage_count
               FROM spot_signals WHERE spot_id = :s"""), {"s": spot_id}).mappings().one()
    except ProgrammingError:
        db.rollback()
        raise HTTPException(503, "this feature is not switched on yet (run db/migrations/003_community.sql)")
    disputed = False
    if kind == "not_garbage" and counts["not_garbage_count"] >= DISPUTE_AFTER:
        disputed = db.execute(text("UPDATE spots SET status = 'disputed' WHERE id = :s AND status = 'open'"),
                              {"s": spot_id}).rowcount > 0
        if disputed:
            db.execute(text("INSERT INTO audit_log (entity, entity_id, action, details) VALUES ('spot', :s, 'disputed_by_public', :d)"),
                       {"s": spot_id, "d": '{"not_garbage_count": %d}' % counts["not_garbage_count"]})
    db.commit()
    return {**dict(counts), "disputed": disputed}


@router.post("/spots/{spot_id}/seen")
def seen_too(spot_id: int, body: Signal, db: Session = Depends(get_db)):
    return _signal(db, spot_id, "seen", body.device)


@router.post("/spots/{spot_id}/not-garbage")
def not_garbage(spot_id: int, body: Signal, db: Session = Depends(get_db)):
    return _signal(db, spot_id, "not_garbage", body.device)


@router.get("/wards")
def ward_summary(db: Session = Depends(get_db)):
    rows = db.execute(text(
        """SELECT w.id, w.name,
                  count(s.id) FILTER (WHERE s.status <> 'cleaned') AS open_spots,
                  count(s.id) FILTER (WHERE s.status = 'cleaned') AS cleaned_spots
           FROM wards w LEFT JOIN spots s ON s.ward_id = w.id
           GROUP BY w.id, w.name ORDER BY open_spots DESC, w.name""")).mappings().all()
    return [dict(r) for r in rows]
