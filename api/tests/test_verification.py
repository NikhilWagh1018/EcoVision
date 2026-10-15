from datetime import datetime, timedelta, timezone

import cv2
import numpy as np
import pytest

from app.services import refill, triage
from app.services.verification import (compute_phash, haversine_m, orb_inliers,
                                       phash_distance, run_checks)


def make_scene(path, seed=0, shift=0):
    rng = np.random.default_rng(seed)
    img = np.full((600, 800, 3), 120, np.uint8)
    for _ in range(120):  # textured blobs so ORB has features
        x, y = int(rng.integers(40, 760)), int(rng.integers(40, 560))
        cv2.circle(img, (x, y), int(rng.integers(5, 30)),
                   tuple(int(v) for v in rng.integers(0, 255, 3)), -1)
    if shift:
        img = np.roll(img, shift, axis=1)
    cv2.imwrite(str(path), img)


def test_haversine_known_distance():
    # ~111 m per 0.001 degree latitude
    assert 105 < haversine_m(18.5, 73.9, 18.501, 73.9) < 117


def test_same_scene_matches_and_different_does_not(tmp_path):
    a, b, c = tmp_path / "a.jpg", tmp_path / "b.jpg", tmp_path / "c.jpg"
    make_scene(a, seed=1)
    make_scene(b, seed=1, shift=25)   # same scene, slightly moved camera
    make_scene(c, seed=99)            # different scene
    assert orb_inliers(str(a), str(b)) >= 15
    assert orb_inliers(str(a), str(c)) < 15


def test_reused_photo_detected(tmp_path):
    a = tmp_path / "a.jpg"
    make_scene(a, seed=3)
    h = compute_phash(str(a))
    assert phash_distance(h, h) == 0


def _checks(tmp_path, **over):
    a, b = tmp_path / "before.jpg", tmp_path / "after.jpg"
    make_scene(a, seed=5)
    make_scene(b, seed=5, shift=20)
    now = datetime.now(timezone.utc)
    args = dict(spot_lat=18.5, spot_lon=73.9, after_lat=18.5, after_lon=73.9,
                captured_at=now - timedelta(seconds=30), received_at=now,
                after_phash=compute_phash(str(b)), own_spot_phashes=[compute_phash(str(a))],
                other_phashes=[],
                before_path=str(a), after_path=str(b), max_distance_m=25,
                max_time_gap_s=600, phash_min_distance=6, own_spot_min_distance=2, min_orb_inliers=15)
    args.update(over)
    return run_checks(**args)


def test_genuine_cleanup_passes(tmp_path):
    assert _checks(tmp_path).all_ok


def test_wrong_location_fails(tmp_path):
    assert not _checks(tmp_path, after_lat=18.51).gps_ok


def test_old_or_future_photo_fails(tmp_path):
    now = datetime.now(timezone.utc)
    assert not _checks(tmp_path, captured_at=now - timedelta(hours=3)).time_ok
    assert not _checks(tmp_path, captured_at=now + timedelta(minutes=5)).time_ok


def test_reuse_of_photo_from_another_spot_fails(tmp_path):
    b = tmp_path / "after.jpg"
    make_scene(b, seed=5, shift=20)
    r = _checks(tmp_path, other_phashes=[compute_phash(str(b))])
    assert not r.hash_ok


def test_before_photo_resubmitted_as_after_fails(tmp_path):
    a = tmp_path / "before.jpg"
    make_scene(a, seed=5)
    r = _checks(tmp_path, after_phash=compute_phash(str(a)),
                own_spot_phashes=[compute_phash(str(a))], after_path=str(a))
    assert not r.hash_ok


def test_refill_and_triage():
    assert refill.summarise([2, 3, 3]) == {"avg_refill_days": 2.7, "suggested_gap_days": 2, "samples": 3}
    assert triage.priority_score("severe", 60, 4, True, 3) > triage.priority_score("moderate", 20, 1, False, 1)
