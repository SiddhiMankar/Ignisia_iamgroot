"""
grader-dashboard/pipeline
Exposes all pipeline modules for clean imports from app.py.
"""

from .rubric import highlight_keywords, parse_sidebar_keywords, count_keyword_hits, DEFAULT_KEYWORDS
from .edge_cases import is_edge_case, scan_answers
from .metrics import MetricsTracker, PipelineMetrics, format_metrics_for_display, extrapolate_per_100
from .multilingual import detect_language, tag_answers_with_language, language_summary

__all__ = [
    # Phase 4
    "highlight_keywords",
    "parse_sidebar_keywords",
    "count_keyword_hits",
    "DEFAULT_KEYWORDS",
    # Phase 5
    "is_edge_case",
    "scan_answers",
    # Phase 6
    "detect_language",
    "tag_answers_with_language",
    "language_summary",
    # Phase 7
    "MetricsTracker",
    "PipelineMetrics",
    "format_metrics_for_display",
    "extrapolate_per_100",
]
