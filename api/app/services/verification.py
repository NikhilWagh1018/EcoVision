"""Four anti-fraud checks for cleanup verification.

Pure functions: no database, no web framework. Easy to unit test and tune.
Thresholds come from settings and are placeholders until pilot data fixes them.
"""
from dataclasses import dataclass
from datetime import datetime
from math import asin, cos, radians, sin, sqrt

import cv2
import imagehash
import numpy as np
from PIL import Image


def haversine_m(lat1, lon1, lat2, lon2) -> float:
    r = 6371000.0
    p1, p2 = radians(lat1), radians(lat2)
    dphi, dlmb = p2 - p1, radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(p1) * cos(p2) * sin(dlmb / 2) ** 2
    return 2 * r * asin(sqrt(a))


def compute_phash(path: str) -> str:
    return str(imagehash.phash(Image.open(path)))


def phash_distance(h1: str, h2: str) -> int:
    return imagehash.hex_to_hash(h1) - imagehash.hex_to_hash(h2)


def orb_inliers(path_a: str, path_b: str, max_side: int = 1000) -> int:
    """Number of RANSAC-consistent ORB matches. High = same scene."""
    def load(p):
        img = cv2.imread(p, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return None
        s = max_side / max(img.shape)
        return cv2.resize(img, None, fx=s, fy=s) if s < 1 else img

    a, b = load(path_a), load(path_b)
    if a is None or b is None:
        return 0
    orb = cv2.ORB_create(nfeatures=2000)
    ka, da = orb.detectAndCompute(a, None)
    kb, db_ = orb.detectAndCompute(b, None)
    if da is None or db_ is None or len(ka) < 8 or len(kb) < 8:
        return 0
    matcher = cv2.BFMatcher(cv2.NORM_HAMMING)
    pairs = matcher.knnMatch(da, db_, k=2)
    good = [m for m, n in (p for p in pairs if len(p) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < 8:
        return 0
    src = np.float32([ka[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([kb[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    _, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
    return int(mask.sum()) if mask is not None else 0


@dataclass
class CheckResult:
    gps_ok: bool
    time_ok: bool
    hash_ok: bool
    orb_ok: bool
    distance_m: float
    time_gap_s: float
    phash_distance: int  # smallest distance to any earlier photo
    orb_inliers: int

    @property
    def all_ok(self) -> bool:
        return self.gps_ok and self.time_ok and self.hash_ok and self.orb_ok


def run_checks(
    *,
    spot_lat: float, spot_lon: float,
    after_lat: float, after_lon: float,
    captured_at: datetime, received_at: datetime,
    after_phash: str, own_spot_phashes: list[str], other_phashes: list[str],
    before_path: str, after_path: str,
    max_distance_m: float, max_time_gap_s: float,
    phash_min_distance: int, own_spot_min_distance: int, min_orb_inliers: int,
) -> CheckResult:
    dist = haversine_m(spot_lat, spot_lon, after_lat, after_lon)
    gap = (received_at - captured_at).total_seconds()
    # negative gap = photo "from the future" -> suspicious
    time_ok = 0 <= gap <= max_time_gap_s
    # Before/after photos of one spot are similar by design, so the same-spot
    # comparison only flags near-identical images (an exact reuse of the before photo).
    # Photos from any other report use the looser threshold.
    own = min((phash_distance(after_phash, h) for h in own_spot_phashes), default=64)
    other = min((phash_distance(after_phash, h) for h in other_phashes), default=64)
    hash_ok = own >= own_spot_min_distance and other >= phash_min_distance
    min_hash = min(own, other)
    inl = orb_inliers(before_path, after_path)
    return CheckResult(
        gps_ok=dist <= max_distance_m,
        time_ok=time_ok,
        hash_ok=hash_ok,
        orb_ok=inl >= min_orb_inliers,
        distance_m=round(dist, 1),
        time_gap_s=round(gap, 1),
        phash_distance=int(min_hash),
        orb_inliers=inl,
    )
