"""Refill statistics: days between a verified cleanup and coverage returning."""
from datetime import datetime
from statistics import mean


def refill_days(cleaned_at: datetime, refilled_at: datetime) -> float:
    return (refilled_at - cleaned_at).total_seconds() / 86400


def suggest_gap(avg_refill_days: float) -> int:
    """Visit slightly before the spot is expected to refill, at least daily."""
    return max(1, int(avg_refill_days * 0.8))


def summarise(history_days: list[float]) -> dict | None:
    if not history_days:
        return None
    avg = mean(history_days)
    return {"avg_refill_days": round(avg, 1), "suggested_gap_days": suggest_gap(avg),
            "samples": len(history_days)}
