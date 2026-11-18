"""Analytics endpoints for the admin dashboard: heatmap points and city/ward summary."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..db import get_db
from ..services import analytics

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

# Latest severity per spot (officer correction wins) + how many reports the spot has.
HEATMAP_SQL = """
SELECT s.id, ST_Y(s.location) AS lat, ST_X(s.location) AS lon, s.status,
       (SELECT COALESCE(p.corrected_severity, p.severity)
          FROM reports r JOIN predictions p ON p.report_id = r.id
         WHERE r.spot_id = s.id ORDER BY r.captured_at DESC LIMIT 1) AS severity,
       (SELECT count(*) FROM reports r WHERE r.spot_id = s.id AND r.kind = 'before') AS report_count
FROM spots s
WHERE (:ward_id IS NULL OR s.ward_id = :ward_id)
  AND s.first_reported_at >= now() - make_interval(days => :days)
ORDER BY s.id
LIMIT 5000
"""


@router.get("/heatmap")
def heatmap(
    ward_id: int | None = None,
    days: int = Query(90, ge=1, le=3650, description="Only spots first reported within this many days"),
    include_cleaned: bool = False,
    db: Session = Depends(get_db),
):
    """Weighted points (weight 0..1) ready for a Leaflet/MapLibre heat layer."""
    rows = [dict(r) for r in db.execute(text(HEATMAP_SQL), {"ward_id": ward_id, "days": days}).mappings()]
    points = analytics.build_heatmap(rows, include_cleaned=include_cleaned)
    return {"count": len(points), "days": days, "ward_id": ward_id, "points": points}


@router.get("/summary")
def summary(
    ward_id: int | None = None,
    days: int = Query(30, ge=1, le=3650, description="Window for the daily trend"),
    db: Session = Depends(get_db),
):
    """Headline numbers, severity mix, verification outcomes, ward ranking and daily trend."""
    params = {"ward_id": ward_id, "days": days}

    spots = db.execute(text(
        """SELECT count(*) AS total,
                  count(*) FILTER (WHERE status = 'open') AS open,
                  count(*) FILTER (WHERE status = 'cleaned') AS cleaned,
                  count(*) FILTER (WHERE status = 'disputed') AS disputed
           FROM spots WHERE (:ward_id IS NULL OR ward_id = :ward_id)"""), params).mappings().one()

    severity = db.execute(text(
        """SELECT COALESCE(sev, 'unrated') AS severity, count(*) AS n FROM (
             SELECT (SELECT COALESCE(p.corrected_severity, p.severity)
                       FROM reports r JOIN predictions p ON p.report_id = r.id
                      WHERE r.spot_id = s.id ORDER BY r.captured_at DESC LIMIT 1) AS sev
               FROM spots s
              WHERE s.status <> 'cleaned' AND (:ward_id IS NULL OR s.ward_id = :ward_id)) t
           GROUP BY 1 ORDER BY 2 DESC"""), params).mappings().all()

    verdicts = db.execute(text(
        """SELECT c.verdict, count(*) AS n FROM cleanups c JOIN spots s ON s.id = c.spot_id
            WHERE (:ward_id IS NULL OR s.ward_id = :ward_id) GROUP BY c.verdict"""), params).mappings().all()
    verdict_counts = {r["verdict"]: r["n"] for r in verdicts}

    review_queue = db.execute(text(
        """SELECT count(*) FROM predictions p JOIN reports r ON r.id = p.report_id
             JOIN spots s ON s.id = r.spot_id
            WHERE p.needs_review AND p.reviewed_by IS NULL
              AND (:ward_id IS NULL OR s.ward_id = :ward_id)"""), params).scalar_one()

    disputes = db.execute(text(
        """SELECT count(*) FILTER (WHERE cf.answer = 'still_dirty') AS still_dirty,
                  count(*) AS total
             FROM confirmations cf JOIN cleanups c ON c.id = cf.cleanup_id
             JOIN spots s ON s.id = c.spot_id
            WHERE (:ward_id IS NULL OR s.ward_id = :ward_id)"""), params).mappings().one()

    hours = [r[0] for r in db.execute(text(
        """SELECT EXTRACT(EPOCH FROM (last_cleaned_at - first_reported_at)) / 3600.0
             FROM spots WHERE status = 'cleaned' AND last_cleaned_at IS NOT NULL
              AND (:ward_id IS NULL OR ward_id = :ward_id)"""), params).all()]

    wards = db.execute(text(
        """SELECT w.id, w.name,
                  count(s.id) FILTER (WHERE s.status <> 'cleaned') AS open_spots,
                  count(s.id) FILTER (WHERE s.status = 'cleaned') AS cleaned_spots
             FROM wards w LEFT JOIN spots s ON s.ward_id = w.id
            WHERE (:ward_id IS NULL OR w.id = :ward_id)
            GROUP BY w.id, w.name ORDER BY open_spots DESC, w.name LIMIT 20"""), params).mappings().all()

    trend = db.execute(text(
        """SELECT d::date AS day,
                  (SELECT count(*) FROM spots s WHERE s.first_reported_at::date = d::date
                      AND (:ward_id IS NULL OR s.ward_id = :ward_id)) AS reported,
                  (SELECT count(*) FROM spots s WHERE s.last_cleaned_at::date = d::date
                      AND (:ward_id IS NULL OR s.ward_id = :ward_id)) AS cleaned
             FROM generate_series(current_date - (:days - 1), current_date, interval '1 day') d
            ORDER BY day"""), params).mappings().all()

    return {
        "ward_id": ward_id,
        "spots": dict(spots),
        "clearance_rate_pct": analytics.rate(spots["cleaned"], spots["total"]),
        "open_by_severity": {r["severity"]: r["n"] for r in severity},
        "cleanup_verdicts": verdict_counts,
        "rejection_rate_pct": analytics.rate(verdict_counts.get("rejected", 0), sum(verdict_counts.values())),
        "review_queue": review_queue,
        "citizen_disputes": {"still_dirty": disputes["still_dirty"], "total": disputes["total"],
                             "dispute_rate_pct": analytics.rate(disputes["still_dirty"], disputes["total"])},
        "time_to_clean": analytics.hours_to_clean_stats(hours),
        "top_wards": [dict(r) for r in wards],
        "daily_trend": [{"day": r["day"].isoformat(), "reported": r["reported"], "cleaned": r["cleaned"]}
                        for r in trend],
    }
