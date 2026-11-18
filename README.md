# EcoVision AI

Multi-Model Intelligent Waste Assessment and Decision Support System (BE project).

## Run it
```
cp .env.example .env
docker compose up --build
# API docs: http://localhost:8000/docs
```
Run tests without Docker: `cd api && pip install -r requirements.txt && pytest`

## What exists now
- PostGIS schema (db/init.sql): wards, spots, reports, predictions, cleanups, confirmations, audit_log
- FastAPI: create report (auto-merges duplicates within 15 m), list/view spots, submit cleanup with the 4 anti-fraud checks, citizen confirm, officer review queue and corrections
- Verification checks (GPS, timestamp, perceptual hash, ORB) with unit tests
- Triage score and refill statistics
- Analytics endpoints for the admin dashboard: `/api/v1/analytics/heatmap` (weighted points, filter by ward and age) and `/api/v1/analytics/summary` (totals, severity mix, verification outcomes, ward ranking, daily trend)
- Field PWA (web/field-pwa): in-app camera, ghost-overlay after photo, offline queue, verification result screen
- ML training scripts (classifier, segmenter) and ONNX export

## Not built yet (see docs/TASKS.md)
OTP auth, ONNX pre/post-processing (api/app/services/inference.py), ward data, PDF/CSV export, the admin dashboard and citizen confirm page.
Until models exist, every report goes to the review queue so the full flow can be tested.
