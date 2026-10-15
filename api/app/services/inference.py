"""Model inference. Loads ONNX models if present; otherwise reports 'unavailable'.

Until the first trained models exist, every report is routed to the admin
review queue (needs_review=True) so the pipeline and the human-in-the-loop
flow can be built and tested end to end.
"""
import os
from dataclasses import dataclass, field

from ..config import settings

SEVERITY = ["clean", "moderate", "severe"]
TAGS = ["bagged", "loose", "burnt", "mixed", "near_drain"]


@dataclass
class Prediction:
    model_version: str
    severity: str | None = None
    confidence: float | None = None
    tags: list[str] = field(default_factory=list)
    coverage_pct: float | None = None
    needs_review: bool = True


_sessions: dict = {}


def _session(name: str):
    path = os.path.join(settings.model_dir, name)
    if not os.path.exists(path):
        return None
    if name not in _sessions:
        import onnxruntime as ort
        _sessions[name] = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
    return _sessions[name]


def predict(image_path: str) -> Prediction:
    cls = _session("severity_v1.onnx")
    seg = _session("segmenter_v1.onnx")
    if cls is None or seg is None:
        return Prediction(model_version="none", needs_review=True)
    # TODO (ML owner): preprocess image, run cls + seg sessions, decode outputs.
    # Contract: fill severity, confidence, tags, coverage_pct; set
    # needs_review = confidence < settings.confidence_threshold.
    raise NotImplementedError("Wire up ONNX pre/post-processing once models are trained")
