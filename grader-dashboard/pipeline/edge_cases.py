"""
Phase 5 — Edge Case Detection
Uses lightweight regex heuristics to flag student answers that contain
mathematical formulas or numeric values but appear to have wrong results.
No complex math parser — demo-safe and fast.
"""

import re

# ── Regex patterns ────────────────────────────────────────────────────────────

# Detects math operators commonly used in exam answers
_FORMULA_PATTERN = re.compile(r"[=+\-*/^÷×]")

# Detects standalone numbers (integers or decimals)
_NUMBER_PATTERN = re.compile(r"\b\d+(\.\d+)?\b")

# Extracts all numeric tokens from a string
_ALL_NUMBERS_PATTERN = re.compile(r"-?\d+(?:\.\d+)?")


# ── Core detection logic ──────────────────────────────────────────────────────

def _extract_numbers(text: str) -> list[float]:
    """Returns all numeric values found in text as floats."""
    return [float(n) for n in _ALL_NUMBERS_PATTERN.findall(text)]


def _has_formula(text: str) -> bool:
    """Returns True if text contains any arithmetic operator character."""
    return bool(_FORMULA_PATTERN.search(text))


def _has_numeric(text: str) -> bool:
    """Returns True if text contains at least one standalone number."""
    return bool(_NUMBER_PATTERN.search(text))


def _numeric_mismatch(text: str, expected_answer: str) -> bool:
    """
    Simple mismatch check: extracts numbers from both strings and compares
    the last number in each (assumed to be the final calculated result).
    Returns True if they differ by more than a small tolerance.
    """
    answer_nums = _extract_numbers(text)
    expected_nums = _extract_numbers(expected_answer)

    if not answer_nums or not expected_nums:
        return False  # Can't compare without numbers on both sides

    # Compare the last numeric value (typically the result)
    return abs(answer_nums[-1] - expected_nums[-1]) > 0.01


# ── Public API ────────────────────────────────────────────────────────────────

def is_edge_case(
    text: str,
    expected_answer: str | None = None,
) -> tuple[bool, str]:
    """
    Determines if a student answer is an edge case using heuristics.

    Rules (checked in order):
    1. If formula operators found AND expected_answer is given AND numeric
       mismatch → flag as "Formula detected, numeric mismatch"
    2. If formula operators found but no expected_answer → flag as
       "Formula detected (unverified result)"
    3. If only numbers present with no formula → flag as
       "Numeric-only answer — may lack explanation"
    4. Otherwise → not an edge case

    Args:
        text:            Student answer string.
        expected_answer: Optional reference answer to compare numeric result.

    Returns:
        (is_flagged: bool, reason: str)
    """
    if not text or not text.strip():
        return False, ""

    has_formula = _has_formula(text)
    has_numeric = _has_numeric(text)

    if has_formula and expected_answer:
        if _numeric_mismatch(text, expected_answer):
            return True, "⚠️ Formula detected, numeric mismatch with expected answer"
        else:
            return False, ""  # Formula present but result matches — all good

    if has_formula and not expected_answer:
        return True, "⚠️ Formula detected (no expected answer to verify against)"

    if has_numeric and not has_formula:
        return True, "ℹ️ Numeric-only answer — may lack written explanation"

    return False, ""


def scan_answers(
    answers: list[str],
    expected_answer: str | None = None,
) -> list[dict]:
    """
    Runs edge case detection across a list of student answers.

    Args:
        answers:         List of student answer strings.
        expected_answer: Shared expected answer for numeric comparison.

    Returns:
        List of dicts with keys:
          - index (int): position in original list
          - text (str): the answer text
          - flagged (bool)
          - reason (str)
    """
    results = []
    for i, answer in enumerate(answers):
        flagged, reason = is_edge_case(answer, expected_answer)
        if flagged:
            results.append({
                "index": i,
                "text": answer,
                "flagged": True,
                "reason": reason,
            })
    return results
