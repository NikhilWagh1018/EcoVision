"""Read-only endpoints for the public map site. No login required."""
import logging

from fastapi import APIRouter, Depends
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
       {reps} AS representatives
FROM spots s LEFT JOIN wards w ON w.id = s.ward_id
ORDER BY s.id DESC LIMIT 2000
"""

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
    try:
        rows = db.execute(text(SPOTS_BASE.format(reps=REPS))).mappings().all()
    except ProgrammingError as e:
        # The representatives tables (migration 002) are missing: still show the spots.
        db.rollback()
        log.warning("representatives tables missing, serving spots without them: %s", e.orig)
        rows = db.execute(text(SPOTS_BASE.format(reps="'[]'::json"))).mappings().all()
    return [dict(r) for r in rows]


@router.get("/wards")
def ward_summary(db: Session = Depends(get_db)):
    rows = db.execute(text(
        """SELECT w.id, w.name,
                  count(s.id) FILTER (WHERE s.status <> 'cleaned') AS open_spots,
                  count(s.id) FILTER (WHERE s.status = 'cleaned') AS cleaned_spots
           FROM wards w LEFT JOIN spots s ON s.ward_id = w.id
           GROUP BY w.id, w.name ORDER BY open_spots DESC, w.name""")).mappings().all()
    return [dict(r) for r in rows]
