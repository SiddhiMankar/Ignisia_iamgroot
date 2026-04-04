"""
document_parser/rule_utils.py
--------------------------------
Utilities for rule classification, deduplication, weight assignment,
and conversion of raw rubric blocks into clean frontend Rule objects.
"""

import re
import unicodedata


# ──────────────────────────────────────────────────────────────
# 1. LABEL STRIPPING
# ──────────────────────────────────────────────────────────────

# Internal tags added by parse_rubric._extract_step_based_style
_INTERNAL_TAGS = {"[FORMULA]", "[FINAL]", "[GIVEN]", "[STEP]", "[AV]"}

# Section labels that prefix rubric content and should be stripped from description
_LABEL_STRIP_RE = re.compile(
    r'^(?:\[(?:FORMULA|FINAL|GIVEN|STEP|AV)\]\s*)?'   # internal tags
    r'(?:Formula|Final\s*Answer|inal\s*Answer|'         # ← added 'inal Answer' for PDF truncation bug
    r'Substitution|Given|'
    r'Correct\s*(?:Answer|Form|sentence)|Ideal\s*Answer|'
    r'Model\s*Answer|Expected\s*(?:Answer)?|'
    r'Correct\s*verb\s*form|Correction|Solution|Working|Step\s*\d*)\s*[:：]\s*',
    re.IGNORECASE
)


def _strip_label(text: str) -> tuple:
    """
    Strips section label prefixes from rule descriptions.

    Returns (internal_tag, clean_description):
    - internal_tag: "[FORMULA]", "[FINAL]", "[GIVEN]", "[STEP]", "[AV]", or ""
    - clean_description: the labelless content

    Examples:
        "[FORMULA] Speed = Distance / Time"  → ("[FORMULA]", "Speed = Distance / Time")
        "Correct answer: stronger"           → ("", "stronger")
        "Final Answer: 30 km/h"             → ("", "30 km/h")  (tag derived from label)
    """
    text = text.strip()

    # Extract internal tag first
    tag = ""
    for t in _INTERNAL_TAGS:
        if text.startswith(t):
            tag = t
            text = text[len(t):].strip()
            break

    # Strip surrounding quotes (handles ""H2O"" and 'H2O')
    text = text.strip('"\'"\u201c\u201d\u2018\u2019').strip()

    # Now check if there's a section label prefix to strip
    # If there is, that label also informs the tag if we don't have one yet
    label_match = _LABEL_STRIP_RE.match(text)
    if label_match:
        matched_label = label_match.group(0).strip().rstrip(':').strip().lower()
        text = text[label_match.end():].strip().strip('"\'"\u201c\u201d\u2018\u2019').strip()
        # Derive tag from label if not already set
        if not tag:
            if 'formula' in matched_label or 'substitut' in matched_label:
                tag = "[FORMULA]"
            elif 'final' in matched_label:
                tag = "[FINAL]"
            elif 'given' in matched_label:
                tag = "[GIVEN]"

    return tag, text


# ──────────────────────────────────────────────────────────────
# 2. RULE TYPE CLASSIFIER
# ──────────────────────────────────────────────────────────────

# Unit suffixes that signal a measured Final Answer
_UNIT_PATTERN = re.compile(
    r'\b\d[\d./]*\s*'
    r'(?:km/?h|m/?s|cm\u00b2|m\u00b2|km\u00b2|cm|mm|km|kg|g|mg|l|ml|\u00b0C|\u00b0F|'
    r'N|J|W|Pa|Hz|mol|V|A|\u03a9|\u20b9|Rs\.?|%|seconds?|hours?|days?|years?|minutes?)'
    r'\b', re.IGNORECASE
)

# Hindi/Devanagari character range
_DEVANAGARI = re.compile(r'[\u0900-\u097F]')

# Arithmetic computation chain: "60 / 2 = 30", "(45/60) × 100 = 75"
_ARITHMETIC_CHAIN = re.compile(
    r'[\d\s\(\)\[\]×*/+\-\u00f7\u00d7]+'
    r'[=\u003d]\s*[\d\s\(\)\[\]×*/+\-\u00f7\u00d7.]+'
)


def classify_rule_type(description: str, internal_tag: str = "") -> str:
    """
    Classifies a rubric rule string into a specific frontend type.

    Uses internal_tag (from parse_rubric) as the primary signal,
    then falls back to content analysis.

    Priority:
      1. [GIVEN]   → "Step Match" (given data, treated as context step)
      2. [FORMULA] → "Formula Match"
      3. [STEP]    → "Step Match"
      4. [FINAL]   → "Final Answer Match"
      5. [AV]      → "Acceptable Variation"
      6. Content-based: Partial → Step → FinalAnswer → Formula → AV → Exact → Concept
    """
    text = description.strip()
    text_lower = text.lower()

    # ── Tag-based (highest priority, most reliable) ────────────
    if internal_tag == "[FORMULA]":
        return "Formula Match"
    if internal_tag in ("[STEP]", "[GIVEN]"):
        return "Step Match"
    if internal_tag == "[FINAL]":
        return "Final Answer Match"
    if internal_tag == "[AV]":
        return "Acceptable Variation"

    # ── 1. Partial credit ──────────────────────────────────────
    if re.search(r'\b(partial|credit|if correct|award|deduct|may get)\b', text_lower):
        return "Partial Credit"

    # ── 2. Step Match (arithmetic computation) ─────────────────
    # "60 / 2 = 30", "(45/60)×100 = 75", "2x = 10 / 2 = 5"
    # Requires: number-heavy expression with = and result
    if _ARITHMETIC_CHAIN.search(text) and re.search(r'\d', text):
        # Make sure it's a computation, not a formula definition
        # Formula definitions have VARIABLE = expression (F = ma, Speed = D/T)
        # Step computations have numbers on both sides of =
        parts = re.split(r'[=\u003d]', text)
        if len(parts) >= 2 and re.search(r'\d', parts[-1]):
            return "Step Match"

    # ── 3. Final Answer Match ──────────────────────────────────
    if _UNIT_PATTERN.search(text) and len(text) <= 30:
        return "Final Answer Match"
    # Short numeric or "x = N" answer
    if re.match(r'^\w\s*=\s*\d+\.?\d*\s*$', text):
        return "Final Answer Match"
    # Plain number answer
    if re.match(r'^\d[\d.,/]*$', text.strip()):
        return "Final Answer Match"

    # ── 4. Formula Match (variable = expression) ───────────────
    # Requires a letter on the left of =, not just a number
    if re.search(r'[a-zA-Z\u03b1-\u03c9\u03a0-\u03a9\u03c0\u03a3]\s*=\s*\S', text):
        # Distinguish formula from step: formula has a NAMED variable
        # Step has a computation result (already caught above)
        return "Formula Match"
    # Multiplication-style formula: "P × R × T / 100"
    if re.search(r'[A-Za-z]\s*[\u00d7\u00f7*/]\s*[A-Za-z]', text):
        return "Formula Match"

    # ── 5. Acceptable Variation ────────────────────────────────
    # Devanagari text = Hindi variant of an English answer
    if _DEVANAGARI.search(text) and len(text) <= 60:
        return "Acceptable Variation"

    # ── 6. Exact Match (short single-concept answer) ───────────
    # Chemical formula (H₂O, CO₂, NaCl), single word, or short phrase
    if len(text) <= 30 and not re.search(r'[,;]', text):
        # Chemical formula pattern
        if re.match(r'^[A-Z][a-z]?[\d\u2080-\u2089\u00b2\u00b3]*(?:[A-Z][a-z]?[\d\u2080-\u2089]*)*$', text):
            return "Exact Match"
        # 1-3 word answer (Delhi, New Delhi, stronger, True)
        if len(text.split()) <= 3:
            return "Exact Match"

    # ── 7. Concept Match (fallback) ────────────────────────────
    return "Concept Match"


def assign_weight(rule_type: str, marks_in_line: int = 0) -> int:
    if marks_in_line > 0:
        return marks_in_line
    return {
        "Exact Match": 2,
        "Formula Match": 2,
        "Final Answer Match": 2,
        "Step Match": 1,
        "Concept Match": 1,
        "Acceptable Variation": 1,
        "Keyword Match": 1,
        "Partial Credit": 1,
    }.get(rule_type, 1)


# ──────────────────────────────────────────────────────────────
# 3. QUESTION TITLE FILTER
# ──────────────────────────────────────────────────────────────

# Instruction verbs that start question titles (not rubric content)
_INSTRUCTION_VERBS = re.compile(
    r'^(?:Identify|Fill\s*in|Change(?:\s+to)?|Choose|Simple|Find|'
    r'Calculate|Explain|Write|Describe|Define|State|List|'
    r'Correct(?:the)?|Convert|Solve|Complete|Match|Rewrite|'
    r'Translate|Give|Name|Answer|Underline|Circle|'
    r'Determine|Evaluate|Simplify|Prove|Show|Expand|'
    r'Read|Comprehension|Passage)\b',
    re.IGNORECASE
)

# Grammar exercise type patterns  
_GRAMMAR_EXERCISE = re.compile(
    r'\b(tense|passive\s*voice|active\s*voice|fill\s*in|the\s*blank|'
    r'correct\s*the|error|underline|circle|rewrite|grammar)\b',
    re.IGNORECASE
)


def _is_question_title(text: str, question_prompt: str = "") -> bool:
    """
    Returns True if text is likely a question instruction/title that should
    NOT appear in the rules list.

    A line is a likely question title if:
    - It matches instruction verb patterns (Identify, Fill in, Calculate...)
    - It's short (<= 50 chars) AND is grammar exercise language
    - It's identical or near-identical to the question_prompt
    """
    stripped = text.strip().lstrip("[GIVEN] ").lstrip("[STEP] ")

    # Never filter if it has formula/math content
    if re.search(r'[=+\-/×÷πΩ₂₃]', stripped) or re.search(r'\d{2,}', stripped):
        return False
    # Never filter Devanagari content (could be the answer itself)
    if _DEVANAGARI.search(stripped):
        return False

    # Match instruction verbs
    if _INSTRUCTION_VERBS.match(stripped) and len(stripped) <= 70:
        return True
    # Grammar exercise language
    if _GRAMMAR_EXERCISE.search(stripped) and len(stripped) <= 60:
        return True
    # Near-identical to question prompt
    if question_prompt and len(stripped) >= 5:
        q_norm = re.sub(r'\s+', ' ', question_prompt.lower().strip())
        t_norm = re.sub(r'\s+', ' ', stripped.lower().strip())
        if t_norm == q_norm or t_norm in q_norm:
            return True

    return False


# ──────────────────────────────────────────────────────────────
# 4. RULE DEDUPLICATION
# ──────────────────────────────────────────────────────────────

def _normalize_for_dedup(text: str) -> str:
    """Normalized comparison key: strips tags, bullets, quotes, subscripts, lowercases."""
    text = re.sub(r'^\[(?:AV|FORMULA|FINAL|GIVEN|STEP)\]\s*', '', text)
    text = re.sub(r'^[•●\-\*]\s*', '', text)
    text = text.strip('"\'"\u201c\u201d\u2018\u2019').strip()
    text = unicodedata.normalize('NFC', text)
    subscript_map = str.maketrans(
        '₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹',
        '01234567890123456789'
    )
    text = text.translate(subscript_map)
    return re.sub(r'\s+', ' ', text.lower()).strip()


def deduplicate_rules(rules: list) -> list:
    """
    Removes duplicate / near-duplicate rules.
    Normalizes: [AV] prefix, bullets, surrounding quotes, subscripts.
    Drops short fragments that are proper substrings of longer rules.
    When a longer rule supersedes a shorter one, the shorter is removed.
    """
    seen_keys: list[str] = []
    deduped: list[dict] = []

    for rule in rules:
        desc = rule.get("description", "").strip()
        if not desc or len(desc) < 2:
            continue

        key = _normalize_for_dedup(desc)
        if not key:
            continue

        # Exact duplicate
        if key in seen_keys:
            continue

        # Fragment: this key is a substring of something already added
        is_fragment = any(
            key in existing and len(key) < len(existing) - 2
            for existing in seen_keys
        )
        if is_fragment:
            continue

        # Domination: remove shorter rules this new one subsumes
        dominated = [
            i for i, existing in enumerate(seen_keys)
            if existing in key and len(existing) < len(key) - 2
        ]
        for i in sorted(dominated, reverse=True):
            seen_keys.pop(i)
            deduped.pop(i)

        seen_keys.append(key)
        deduped.append(rule)

    return deduped


# ──────────────────────────────────────────────────────────────
# 5. SECTION HEADER FILTER
# ──────────────────────────────────────────────────────────────

_SECTION_HEADER_ONLY_RE = re.compile(
    r'^(?:Rubric|Ideal\s*Answer|Acceptable(?:\s*Variations?)?|'
    r'Model\s*Answer|Answer\s*Key|Expected(?:\s*Answer)?|'
    r'Marking(?:\s*Scheme)?|Given|Formula|Substitution|'
    r'Final\s*Answer|Note|Hint|Solution|Working|'
    r'Correct\s*(?:Form|Answer|sentence|verb\s*form)|'
    r'Fill\s*in(?:\s*the\s*blank)?|Passive\s*Voice|Correction'
    r')(?:\s*\([^)]*\))?\s*[:：]?\s*$',
    re.IGNORECASE
)


# ──────────────────────────────────────────────────────────────
# 6. MAIN CONVERTER: RUBRIC BLOCK → FRONTEND RULES
# ──────────────────────────────────────────────────────────────

def rubric_to_rules(rubric_block: dict, question_prompt: str = "") -> list:
    """
    Converts a parsed rubric block dict into clean frontend Rule objects.

    For each concept/formula/keyword:
    1. Strip section label prefixes ([FORMULA], Final Answer:, Correct answer: etc.)
    2. Filter out question title lines and section-header-only lines
    3. Classify by type using tag + content analysis
    4. Assign weight from inline marks or type default
    5. Deduplicate
    """
    from document_parser.text_cleaner import extract_marks_from_line

    prompt_lower = question_prompt.lower().strip()
    rules = []
    title_filtered_count = 0
    header_filtered_count = 0

    # ── Keywords ───────────────────────────────────────────────
    for kw in rubric_block.get("keywords", []):
        kw = kw.strip()
        if kw and not _SECTION_HEADER_ONLY_RE.match(kw):
            rules.append({"type": "Keyword Match", "description": kw, "weight": 1})

    # ── Expected concepts ──────────────────────────────────────
    for concept in rubric_block.get("expected_concepts", []):
        concept = concept.strip()
        if not concept:
            continue

        # Step 1: Strip label prefix, get tag
        tag, clean = _strip_label(concept)

        if not clean or len(clean) < 2:
            continue

        # Step 2: Skip bare section headers
        if _SECTION_HEADER_ONLY_RE.match(clean):
            header_filtered_count += 1
            continue

        # Step 3: Skip question title lines
        if _is_question_title(clean, prompt_lower):
            title_filtered_count += 1
            continue

        # Step 4: Extract marks and strip trailing mark notation
        marks = extract_marks_from_line(clean)
        # Strip (N) or [N marks] annotation — these are mark labels inside brackets
        clean = re.sub(r'[\(\[]\s*\d+\s*(?:marks?)?\s*[\)\]]$', '', clean).strip()
        # SAFE trailing-digit strip: only strip a lone digit that follows a LETTER
        # (mark annotations like "Uses sunlight 2"), NOT digits after operators
        # (equation results like "= 30", "/ 100", "× 154", "T = 2", "45 out of 60")
        clean = re.sub(r'(?<=[a-zA-Z\u0900-\u097F])\s+\d+\s*$', '', clean).strip()
        clean = clean.strip('"\'“”‘’').strip()

        if not clean or len(clean) < 2:
            continue

        # Step 5: Classify
        rule_type = classify_rule_type(clean, internal_tag=tag)

        rules.append({
            "type": rule_type,
            "description": clean,
            "weight": assign_weight(rule_type, marks)
        })

    # ── Formula rules ──────────────────────────────────────────
    for formula in rubric_block.get("formula_rules", []):
        formula = formula.strip()
        if not formula:
            continue
        tag, clean = _strip_label(formula)
        if not clean or _SECTION_HEADER_ONLY_RE.match(clean):
            continue
        clean = clean.strip('"\'"\u201c\u201d\u2018\u2019').strip()
        if clean:
            rules.append({
                "type": "Formula Match",
                "description": clean,
                "weight": assign_weight("Formula Match")
            })

    # ── Partial credit ─────────────────────────────────────────
    for pc in rubric_block.get("partial_credit_rules", []):
        pc = pc.strip()
        if pc:
            rules.append({"type": "Partial Credit", "description": pc, "weight": 1})

    result = deduplicate_rules(rules)

    # Log filtering stats if anything was removed
    if title_filtered_count or header_filtered_count:
        import logging
        log = logging.getLogger("document_parser.rule_utils")
        if title_filtered_count:
            log.debug(f"  Filtered {title_filtered_count} question-title line(s) from rules")
        if header_filtered_count:
            log.debug(f"  Filtered {header_filtered_count} section-header-only line(s) from rules")

    return result


# ──────────────────────────────────────────────────────────────
# 7. SUMMARY STATS
# ──────────────────────────────────────────────────────────────

def summarize_rules(questions: list) -> dict:
    """Returns rule type counts across all questions for test_extract.py summary."""
    type_counts: dict = {}
    total = 0
    for q in questions:
        for rule in q.get("rules", []):
            t = rule.get("type", "Unknown")
            type_counts[t] = type_counts.get(t, 0) + 1
            total += 1
    return {
        "total_questions": len(questions),
        "total_rules": total,
        "rule_type_counts": dict(sorted(type_counts.items(), key=lambda x: -x[1]))
    }
