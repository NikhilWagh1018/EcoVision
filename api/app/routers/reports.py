from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..services import inference
from ..services.verification import compute_phash
from ..storage import save_upload

router = APIRouter(prefix="/api/v1", tags=["reports"])
DEV_USER_ID = 1  # TODO: replace with the authenticated user (OTP login)


def audit(db: Session, entity: str, entity_id: int, action: str, details: dict | None = None):
    db.execute(
        text("INSERT INTO audit_log (entity, entity_id, action, actor_id, details) "
             "VALUES (:e, :i, :a, :u, CAST(:d AS jsonb))"),
        {"e": entity, "i": entity_id, "a": action, "u": DEV_USER_ID,
         "d": __import__("json").dumps(details or {})},
    )


def store_prediction(db: Session, report_id: int, pred: inference.Prediction) -> int:
    needs_review = pred.needs_review or (pred.confidence or 0) < settings.confidence_threshold
    return db.execute(
        text("""INSERT INTO predictions (report_id, model_version, severity, confidence, tags,
                coverage_pct, needs_review)
                VALUES (:r, :m, :s, :c, :t, :cov, :nr) RETURNING id"""),
        {"r": report_id, "m": pred.model_version, "s": pred.severity, "c": pred.confidence,
         "t": pred.tags, "cov": pred.coverage_pct, "nr": needs_review},
    ).scalar_one()


@router.post("/reports")
def create_report(
    photo: UploadFile = File(...),
    lat: float = Form(...),
    lon: float = Form(...),
    captured_at: datetime = Form(...),
    gps_accuracy_m: float | None = Form(None),
    db: Session = Depends(get_db),
):
    path = save_upload(photo, "reports")
    phash = compute_phash(path)

    # Triage: merge into an existing open spot within the merge radius
    spot = db.execute(
        text("""SELECT id FROM spots
                WHERE status <> 'cleaned'
                  AND ST_DWithin(location::geography,
                                 ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :r)
                ORDER BY ST_Distance(location::geography,
                                     ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography)
                LIMIT 1"""),
        {"lat": lat, "lon": lon, "r": settings.spot_merge_radius_m},
    ).first()
    merged = spot is not None
    if spot:
        spot_id = spot[0]
    else:
        spot_id = db.execute(
            text("""INSERT INTO spots (location, ward_id)
                    VALUES (ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                      (SELECT id FROM wards
                       WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)) LIMIT 1))
                    RETURNING id"""),
            {"lat": lat, "lon": lon},
        ).scalar_one()

    report_id = db.execute(
        text("""INSERT INTO reports (spot_id, user_id, kind, photo_path, phash, location,
                gps_accuracy_m, captured_at)
                VALUES (:s, :u, 'before', :p, :h, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
                        :acc, :cap) RETURNING id"""),
        {"s": spot_id, "u": DEV_USER_ID, "p": path, "h": phash, "lon": lon, "lat": lat,
         "acc": gps_accuracy_m, "cap": captured_at},
    ).scalar_one()

    pred = inference.predict(path)
    store_prediction(db, report_id, pred)
    audit(db, "report", report_id, "created", {"spot_id": spot_id, "merged_into_existing": merged})
    db.commit()
    return {"report_id": report_id, "spot_id": spot_id, "merged_into_existing_spot": merged,
            "severity": pred.severity, "coverage_pct": pred.coverage_pct,
            "needs_review": pred.needs_review}


@router.get("/queue/review")
def review_queue(db: Session = Depends(get_db)):
    rows = db.execute(text(
        """SELECT p.id, p.report_id, r.spot_id, p.severity, p.confidence, p.created_at
           FROM predictions p JOIN reports r ON r.id = p.report_id
           WHERE p.needs_review AND p.reviewed_by IS NULL
           ORDER BY p.created_at LIMIT 100"""
    )).mappings().all()
    return [dict(r) for r in rows]


@router.patch("/predictions/{prediction_id}")
def correct_prediction(prediction_id: int, severity: str, db: Session = Depends(get_db)):
    """Officer correction. Corrected rows are exported as new training labels."""
    if severity not in inference.SEVERITY:
        return {"error": f"severity must be one of {inference.SEVERITY}"}
    db.execute(text("""UPDATE predictions SET corrected_severity=:s, reviewed_by=:u,
                       needs_review=false WHERE id=:i"""),
               {"s": severity, "u": DEV_USER_ID, "i": prediction_id})
    audit(db, "prediction", prediction_id, "corrected", {"severity": severity})
    db.commit()
    return {"ok": True}
