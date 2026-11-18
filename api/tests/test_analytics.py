from app.services.analytics import (build_heatmap, heat_weight, hours_to_clean_stats, rate)


def test_cleaned_spot_has_no_heat():
    assert heat_weight("severe", 5, "cleaned") == 0.0


def test_severity_orders_weight():
    assert heat_weight("severe", 1, "open") > heat_weight("moderate", 1, "open") > heat_weight("clean", 1, "open")


def test_unknown_severity_defaults_to_moderate():
    assert heat_weight(None, 1, "open") == heat_weight("moderate", 1, "open")


def test_duplicate_reports_raise_weight_but_are_capped():
    assert heat_weight("moderate", 4, "open") > heat_weight("moderate", 1, "open")
    assert heat_weight("severe", 6, "open") == heat_weight("severe", 60, "open") == 1.0


def test_weight_within_unit_range():
    for sev in ("clean", "moderate", "severe", None):
        for n in (0, 1, 3, 20):
            assert 0.0 <= heat_weight(sev, n, "open") <= 1.0


def _rows():
    return [
        {"id": 1, "lat": 18.5, "lon": 73.9, "status": "open", "severity": "severe", "report_count": 2},
        {"id": 2, "lat": 18.6, "lon": 73.8, "status": "cleaned", "severity": "clean", "report_count": 1},
        {"id": 3, "lat": 18.7, "lon": 73.7, "status": "open", "severity": None, "report_count": 1},
    ]


def test_heatmap_skips_cleaned_by_default():
    pts = build_heatmap(_rows())
    assert [p["spot_id"] for p in pts] == [1, 3]


def test_heatmap_can_include_cleaned():
    pts = build_heatmap(_rows(), include_cleaned=True)
    assert [p["spot_id"] for p in pts] == [1, 2, 3]
    assert pts[1]["weight"] == 0.0


def test_hours_to_clean_stats():
    s = hours_to_clean_stats([10, 20, 30, None, -5])
    assert s == {"count": 3, "median_hours": 20, "mean_hours": 20.0}
    assert hours_to_clean_stats([]) == {"count": 0, "median_hours": None, "mean_hours": None}


def test_rate_handles_zero():
    assert rate(1, 4) == 25.0
    assert rate(0, 0) is None


def test_routes_registered():
    from app.main import app
    paths = {r.path for r in app.routes}
    assert "/api/v1/analytics/heatmap" in paths
    assert "/api/v1/analytics/summary" in paths
