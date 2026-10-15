import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..services import inference
from ..services.verification import compute_phash, run_checks
from ..storage import save_upload
from .reports import DEV_USER_ID, audit, store_prediction

router = APIRouter(prefix="/api/v1", tags=["spots"])


def decide_verdict(checks_ok: bool, pred: inference.Prediction, before_cov: float | None) -> str:
    if not checks_ok:
        return "rejected"
    if pred.coverage_pct is None:  # no model yet -> human decides
        return "pending_review"
    if pred.coverage_pct <= settings.clean_coverage_pct:
        return "clean"
    if before_cov and pred.coverage_pct < 0.5 * before_cov:
        return "partial"
    return "not_cleaned"


@router.get("/spots")
def list_spots(status: str | None = None, db: Session = Depends(get_db)):
    rows = db.execute(text(
        """SELECT id, ST_Y(location) AS lat, ST_X(location) AS lon, ward_id, status,
                  first_reported_at, last_cleaned_at
           FROM spots WHERE (:st IS NULL OR status = :st) ORDER BY id DESC LIMIT 500"""),
        {"st": status}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/spots/{spot_id}")
def get_spot(spot_id: int, db: Session = Depends(get_db)):
    spot = db.execute(text(
        "SELECT id, ST_Y(location) AS lat, ST_X(location) AS lon, ward_id, status "
        "FROM spots WHERE id=:i"), {"i": spot_id}).mappings().first()
    if not spot:
        raise HTTPException(404, "spot not found")
    reports = db.execute(text(
        """SELECT r.id, r.kind, r.photo_path, r.captured_at, p.severity, p.coverage_pct
           FROM reports r LEFT JOIN predictions p ON p.report_id = r.id
           WHERE r.spot_id=:i ORDER BY r.captured_at"""), {"i": spot_id}).mappings().all()
    out = []
    for r in reports:
        d = dict(r)
        rel = os.path.relpath(d.pop("photo_path"), settings.storage_dir)
        d["photo_url"] = "/media/" + rel.replace(os.sep, "/")
        out.append(d)
    return {**spot, "reports": out}


@router.post("/spots/{spot_id}/cleanup")
def submit_cleanup(
    spot_id: int,
    photo: UploadFile = File(...),
    lat: float = Form(...),
    lon: float = Form(...),
    captured_at: datetime = Form(...),
    gps_accuracy_m: float | None = Form(None),
    db: Session = Depends(get_db),
):
    spot = db.execute(text("SELECT ST_Y(location) AS lat, ST_X(location) AS lon FROM spots WHERE id=:i"),
                      {"i": spot_id}).mappings().first()
    before = db.execute(text(
        """SELECT r.id, r.photo_path, p.coverage_pct FROM reports r
           LEFT JOIN predictions p ON p.report_id=r.id
           WHERE r.spot_id=:i AND r.kind='before' ORDER BY r.captured_at DESC LIMIT 1"""),
        {"i": spot_id}).mappings().first()
    if not spot or not before:
        raise HTTPException(404, "spot or its before-photo not found")

    received_at = datetime.now(timezone.utc)
    path = save_upload(photo, "cleanups")
    phash = compute_phash(path)
    own = [r[0] for r in db.execute(text("SELECT phash FROM reports WHERE spot_id=:i"),
                                    {"i": spot_id}).all()]
    other = [r[0] for r in db.execute(text("SELECT phash FROM reports WHERE spot_id<>:i"),
                                      {"i": spot_id}).all()]

    c = run_checks(
        spot_lat=spot["lat"], spot_lon=spot["lon"], after_lat=lat, after_lon=lon,
        captured_at=captured_at if captured_at.tzinfo else captured_at.replace(tzinfo=timezone.utc),
        received_at=received_at, after_phash=phash, own_spot_phashes=own, other_phashes=other,
        before_path=before["photo_path"], after_path=path,
        max_distance_m=settings.verify_max_distance_m,
        max_time_gap_s=settings.verify_max_time_gap_s,
        phash_min_distance=settings.verify_phash_min_distance,
        own_spot_min_distance=settings.verify_phash_own_spot_min_distance,
        min_orb_inliers=settings.verify_min_orb_inliers,
    )

    after_id = db.execute(text(
        """INSERT INTO reports (spot_id, user_id, kind, photo_path, phash, location,
                gps_accuracy_m, captured_at)
           VALUES (:s, :u, 'after', :p, :h, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326), :acc, :cap)
           RETURNING id"""),
        {"s": spot_id, "u": DEV_USER_ID, "p": path, "h": phash, "lon": lon, "lat": lat,
         "acc": gps_accuracy_m, "cap": captured_at}).scalar_one()

    pred = inference.predict(path)
    store_prediction(db, after_id, pred)
    verdict = decide_verdict(c.all_ok, pred, before["coverage_pct"])

    cleanup_id = db.execute(text(
        """INSERT INTO cleanups (spot_id, before_report_id, after_report_id, gps_ok, time_ok,
                hash_ok, orb_ok, distance_m, time_gap_s, phash_distance, orb_inliers, verdict)
           VALUES (:s, :b, :a, :g, :t, :h, :o, :d, :tg, :pd, :oi, :v) RETURNING id"""),
        {"s": spot_id, "b": before["id"], "a": after_id, "g": c.gps_ok, "t": c.time_ok,
         "h": c.hash_ok, "o": c.orb_ok, "d": c.distance_m, "tg": c.time_gap_s,
         "pd": c.phash_distance, "oi": c.orb_inliers, "v": verdict}).scalar_one()

    if verdict == "clean":
        db.execute(text("UPDATE spots SET status='cleaned', last_cleaned_at=now() WHERE id=:i"),
                   {"i": spot_id})
    audit(db, "cleanup", cleanup_id, "submitted", {"verdict": verdict})
    db.commit()
    return {"cleanup_id": cleanup_id, "verdict": verdict,
            "checks": {"gps": c.gps_ok, "timestamp": c.time_ok,
                       "not_reused": c.hash_ok, "same_scene": c.orb_ok},
            "details": c.__dict__}


@router.get("/spots/{spot_id}/verification")
def get_verification(spot_id: int, db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM cleanups WHERE spot_id=:i ORDER BY created_at DESC"),
                      {"i": spot_id}).mappings().all()
    return [dict(r) for r in rows]


@router.post("/cleanups/{cleanup_id}/confirm")
def confirm(cleanup_id: int, answer: str, db: Session = Depends(get_db)):
    if answer not in ("cleaned", "still_dirty"):
        raise HTTPException(422, "answer must be 'cleaned' or 'still_dirty'")
    db.execute(text("INSERT INTO confirmations (cleanup_id, user_id, answer) VALUES (:c,:u,:a)"),
               {"c": cleanup_id, "u": DEV_USER_ID, "a": answer})
    audit(db, "cleanup", cleanup_id, "citizen_" + answer)
    db.commit()
    return {"ok": True}
