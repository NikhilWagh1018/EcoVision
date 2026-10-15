"""Priority score used to rank spots in the ward queue."""

SEVERITY_WEIGHT = {"clean": 0, "moderate": 1, "severe": 3}


def priority_score(severity: str | None, coverage_pct: float | None,
                   duplicate_reports: int, near_drain: bool, days_open: float) -> float:
    s = SEVERITY_WEIGHT.get(severity or "", 1) * 10
    c = (coverage_pct or 0) * 0.2
    d = min(duplicate_reports, 10) * 1.5
    drain = 8 if near_drain else 0
    age = min(days_open, 14) * 0.7
    return round(s + c + d + drain + age, 2)
