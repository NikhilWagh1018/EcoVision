"""Pure helpers for the analytics endpoints (no DB access, so they are unit-testable)."""
from statistics import median

from .triage import SEVERITY_WEIGHT

# Highest possible raw weight: severe (3) + max duplicate bonus (5 * 0.25).
MAX_DUPLICATE_BONUS = 5
DUPLICATE_STEP = 0.25
MAX_RAW_WEIGHT = max(SEVERITY_WEIGHT.values()) + MAX_DUPLICATE_BONUS * DUPLICATE_STEP


def heat_weight(severity: str | None, report_count: int, status: str) -> float:
    """Heatmap intensity in 0..1. Cleaned spots contribute nothing.

    Unknown severity (no model yet / not reviewed) is treated as 'moderate',
    the same default the triage score uses.
    """
    if status == "cleaned":
        return 0.0
    raw = SEVERITY_WEIGHT.get(severity or "", SEVERITY_WEIGHT["moderate"])
    raw += min(max(report_count - 1, 0), MAX_DUPLICATE_BONUS) * DUPLICATE_STEP
    return round(raw / MAX_RAW_WEIGHT, 3)


def build_heatmap(rows: list[dict], include_cleaned: bool = False) -> list[dict]:
    """rows: dicts with lat, lon, status, severity, report_count. Returns weighted points."""
    points = []
    for r in rows:
        w = heat_weight(r.get("severity"), r.get("report_count") or 1, r["status"])
        if w == 0.0 and not include_cleaned:
            continue
        points.append({"lat": r["lat"], "lon": r["lon"], "weight": w,
                       "spot_id": r["id"], "severity": r.get("severity"), "status": r["status"]})
    return points


def hours_to_clean_stats(hours: list[float]) -> dict:
    """Median / mean / count of hours between first report and verified cleanup."""
    hours = [h for h in hours if h is not None and h >= 0]
    if not hours:
        return {"count": 0, "median_hours": None, "mean_hours": None}
    return {"count": len(hours), "median_hours": round(median(hours), 1),
            "mean_hours": round(sum(hours) / len(hours), 1)}


def rate(part: int, whole: int) -> float | None:
    """Percentage, or None when there is nothing to divide by."""
    return round(100 * part / whole, 1) if whole else None
