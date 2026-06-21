import os
import logging
from typing import Tuple

try:
    import joblib
except Exception:
    joblib = None

LOGGER = logging.getLogger(__name__)
_model = None


def _model_path() -> str:
    return os.path.join(os.path.dirname(__file__), "models_ai", "fake_review_model.pkl")


def _load_model():
    global _model
    if _model is not None:
        return _model
    path = _model_path()
    if joblib is None:
        LOGGER.warning("joblib not available; ML model disabled")
        return None
    if not os.path.exists(path):
        LOGGER.warning("ML model file not found at %s", path)
        return None
    try:
        _model = joblib.load(path)
        LOGGER.info("Loaded ML model from %s", path)
        return _model
    except Exception as e:
        LOGGER.exception("Failed loading ML model: %s", e)
        return None


def detect_fake_review(text: str) -> Tuple[bool, float, str]:
    """Return (is_fake, fake_score, level).

    Level: LOW, MEDIUM, HIGH
    """
    model = _load_model()
    if model is None:
        # fallback: cannot evaluate
        return False, 0.0, "LOW"

    try:
        prediction = model.predict([text])[0]
        probability = None
        if hasattr(model, "predict_proba"):
            probability = float(model.predict_proba([text])[0][1])
        else:
            # if no predict_proba, use prediction as score
            probability = float(prediction)

        is_fake = bool(prediction)

        # determine level thresholds
        if probability >= 0.7:
            level = "HIGH"
        elif probability >= 0.4:
            level = "MEDIUM"
        else:
            level = "LOW"

        return is_fake, probability, level
    except Exception:
        LOGGER.exception("Error during fake review detection")
        return False, 0.0, "LOW"