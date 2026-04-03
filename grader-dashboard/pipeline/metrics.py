"""
Phase 7 — Cost & Efficiency Metrics Logger
Tracks timing and token usage across pipeline stages.
Provides a context-manager (MetricsTracker) for clean stage-wrapping,
and a utility to extrapolate costs to "per 100 sheets".
"""

import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Generator


# ── Data model ───────────────────────────────────────────────────────────────

@dataclass
class PipelineMetrics:
    """Holds all tracked metrics for one grading session."""

    total_answers: int = 0
    total_tokens: int = 0

    ocr_time_sec: float = 0.0
    embedding_time_sec: float = 0.0
    clustering_time_sec: float = 0.0

    # Populated by extrapolate_per_100()
    ocr_per_100: float = 0.0
    embedding_per_100: float = 0.0
    clustering_per_100: float = 0.0
    total_per_100: float = 0.0

    # Derived
    @property
    def total_time_sec(self) -> float:
        return self.ocr_time_sec + self.embedding_time_sec + self.clustering_time_sec

    @property
    def avg_tokens_per_answer(self) -> float:
        if self.total_answers == 0:
            return 0.0
        return self.total_tokens / self.total_answers


# ── Context manager ───────────────────────────────────────────────────────────

class MetricsTracker:
    """
    Wraps pipeline stages and records how long each takes.

    Usage:
        tracker = MetricsTracker()

        with tracker.stage("ocr"):
            answers = ocr_pipeline(pdf_path)

        with tracker.stage("embedding"):
            embeddings = encode_answers(answers)

        with tracker.stage("clustering"):
            labels = cluster_answers(embeddings)

        tracker.finalize(answers)
        metrics = tracker.metrics
    """

    _VALID_STAGES = {"ocr", "embedding", "clustering"}

    def __init__(self) -> None:
        self.metrics = PipelineMetrics()

    @contextmanager
    def stage(self, name: str) -> Generator[None, None, None]:
        """
        Context manager that times a named pipeline stage.

        Args:
            name: One of 'ocr', 'embedding', 'clustering'.
        """
        if name not in self._VALID_STAGES:
            raise ValueError(
                f"Unknown stage '{name}'. Must be one of {self._VALID_STAGES}."
            )
        start = time.perf_counter()
        try:
            yield
        finally:
            elapsed = time.perf_counter() - start
            setattr(self.metrics, f"{name}_time_sec", elapsed)

    def finalize(self, answers: list[str]) -> PipelineMetrics:
        """
        Computes token count from the answer list and runs extrapolation.

        Args:
            answers: List of student answer strings from the OCR stage.

        Returns:
            The populated PipelineMetrics instance.
        """
        self.metrics.total_answers = len(answers)
        self.metrics.total_tokens = sum(len(a.split()) for a in answers)
        extrapolate_per_100(self.metrics)
        return self.metrics


# ── Extrapolation helper ──────────────────────────────────────────────────────

def extrapolate_per_100(metrics: PipelineMetrics) -> PipelineMetrics:
    """
    Scales per-answer timings up to "per 100 sheets" for the UI metrics banner.
    Mutates and returns the same metrics object.

    Args:
        metrics: A PipelineMetrics instance with total_answers and times filled.

    Returns:
        The same metrics object with *_per_100 fields populated.
    """
    n = metrics.total_answers
    if n == 0:
        return metrics

    scale = 100 / n
    metrics.ocr_per_100 = round(metrics.ocr_time_sec * scale, 2)
    metrics.embedding_per_100 = round(metrics.embedding_time_sec * scale, 2)
    metrics.clustering_per_100 = round(metrics.clustering_time_sec * scale, 2)
    metrics.total_per_100 = round(metrics.total_time_sec * scale, 2)
    return metrics


# ── Display formatting ────────────────────────────────────────────────────────

def format_metrics_for_display(metrics: PipelineMetrics) -> dict:
    """
    Returns a flat dict of labelled strings ready for st.metric() calls.

    Keys map directly to Streamlit metric card labels.
    """
    return {
        "📄 Answers Processed": str(metrics.total_answers),
        "🔤 Total Tokens": f"{metrics.total_tokens:,}",
        "⏱️ Processing Time": f"{metrics.total_time_sec:.2f}s",
        "📊 Time / 100 Sheets": f"{metrics.total_per_100:.1f}s",
        "📝 Avg Tokens / Answer": f"{metrics.avg_tokens_per_answer:.1f}",
        # Stage breakdown (for expander detail view)
        "_ocr_sec": f"{metrics.ocr_time_sec:.2f}s",
        "_embed_sec": f"{metrics.embedding_time_sec:.2f}s",
        "_cluster_sec": f"{metrics.clustering_time_sec:.2f}s",
    }
