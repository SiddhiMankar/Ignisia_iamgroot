"""
Phase 6 — Multilingual Support Utilities
Provides language detection badges for student answers using langdetect.
The actual multilingual grouping is handled by the embedding model
(paraphrase-multilingual-MiniLM-L12-v2) in embeddings.py — this module
adds the display layer on top of it.
"""

# Language badge map: langdetect code → emoji flag + label
_LANG_BADGES: dict[str, str] = {
    "en": "🇬🇧 English",
    "hi": "🇮🇳 Hindi",
    "mr": "🇮🇳 Marathi",
    "fr": "🇫🇷 French",
    "de": "🇩🇪 German",
    "es": "🇪🇸 Spanish",
    "zh-cn": "🇨🇳 Chinese",
    "ar": "🇸🇦 Arabic",
}

_FALLBACK_BADGE = "🌐 Unknown"


def detect_language(text: str) -> tuple[str, str]:
    """
    Detects the language of a student answer.

    Args:
        text: Student answer string.

    Returns:
        (lang_code, badge_label) — e.g. ("hi", "🇮🇳 Hindi")
        Falls back to ("unknown", "🌐 Unknown") if detection fails or
        langdetect is not installed.
    """
    try:
        from langdetect import detect, LangDetectException  # type: ignore
        code = detect(text)
        badge = _LANG_BADGES.get(code, f"🌐 {code.upper()}")
        return code, badge
    except ImportError:
        return "unknown", "🌐 (langdetect not installed)"
    except Exception:
        return "unknown", _FALLBACK_BADGE


def tag_answers_with_language(answers: list[str]) -> list[dict]:
    """
    Runs language detection on a list of answers and returns enriched records.

    Args:
        answers: List of student answer strings.

    Returns:
        List of dicts with keys:
          - index (int)
          - text (str)
          - lang_code (str)
          - lang_badge (str)  ← ready for st.caption() or inline display
    """
    tagged = []
    for i, answer in enumerate(answers):
        code, badge = detect_language(answer)
        tagged.append({
            "index": i,
            "text": answer,
            "lang_code": code,
            "lang_badge": badge,
        })
    return tagged


def language_summary(tagged_answers: list[dict]) -> dict[str, int]:
    """
    Returns a count of how many answers were detected per language.
    Useful for the sidebar info callout shown to demo judges.

    Args:
        tagged_answers: Output of tag_answers_with_language().

    Returns:
        Dict mapping badge_label → count, e.g. {"🇬🇧 English": 10, "🇮🇳 Hindi": 5}
    """
    summary: dict[str, int] = {}
    for item in tagged_answers:
        badge = item["lang_badge"]
        summary[badge] = summary.get(badge, 0) + 1
    return summary
