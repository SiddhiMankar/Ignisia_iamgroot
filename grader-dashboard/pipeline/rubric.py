"""
Phase 4 — Rubric Keyword Highlighting
Highlights rubric-relevant keywords inside student answer text using
HTML <mark> tags, ready for Streamlit's st.markdown(unsafe_allow_html=True).
"""

import re

# ── Default keyword set (CS / Data Structures topic) ─────────────────────────
DEFAULT_KEYWORDS: list[str] = [
    "LIFO", "FIFO", "stack", "queue", "O(n)", "O(log n)", "O(1)",
    "time complexity", "space complexity", "recursion", "binary search",
    "heap", "sorting", "linked list", "hash table", "tree", "graph",
    "dynamic programming", "greedy", "divide and conquer",
]

# ── Mark style ────────────────────────────────────────────────────────────────
_MARK_STYLE = "background:#FFD700; color:#000; border-radius:3px; padding:0 2px;"


def highlight_keywords(text: str, keywords: list[str] | None = None) -> str:
    """
    Wraps every occurrence of each keyword (case-insensitive) in a
    styled <mark> tag and returns the resulting HTML string.

    Args:
        text:     Raw student answer string.
        keywords: List of terms to highlight. Falls back to DEFAULT_KEYWORDS.

    Returns:
        HTML string safe for st.markdown(..., unsafe_allow_html=True).
    """
    if not text:
        return text

    if keywords is None:
        keywords = DEFAULT_KEYWORDS

    # Sort longest-first so multi-word phrases aren't broken by sub-matches
    sorted_kw = sorted(keywords, key=len, reverse=True)
    highlighted = text

    for kw in sorted_kw:
        if not kw.strip():
            continue
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        highlighted = pattern.sub(
            lambda m: f'<mark style="{_MARK_STYLE}">{m.group(0)}</mark>',
            highlighted,
        )

    return highlighted


def parse_sidebar_keywords(raw: str) -> list[str]:
    """
    Converts a comma-separated keyword string from a Streamlit sidebar
    text_input into a clean list.

    Args:
        raw: Comma-separated string, e.g. "LIFO, stack, queue"

    Returns:
        List of stripped, non-empty keyword strings.
    """
    return [kw.strip() for kw in raw.split(",") if kw.strip()]


def count_keyword_hits(text: str, keywords: list[str] | None = None) -> dict[str, int]:
    """
    Returns a frequency map of how many times each keyword appears in text.
    Useful for a quick rubric coverage score in the UI.

    Args:
        text:     Student answer.
        keywords: Keywords to count. Falls back to DEFAULT_KEYWORDS.

    Returns:
        Dict mapping keyword → occurrence count.
    """
    if keywords is None:
        keywords = DEFAULT_KEYWORDS

    counts: dict[str, int] = {}
    for kw in keywords:
        matches = re.findall(re.escape(kw), text, re.IGNORECASE)
        if matches:
            counts[kw] = len(matches)
    return counts
