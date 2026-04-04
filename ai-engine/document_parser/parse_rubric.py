import re
from utils.logger import get_logger
from document_parser.text_cleaner import clean_ocr_text, extract_bullet_items, extract_marks_from_line

logger = get_logger(__name__)


# Section headers that signal rubric content within a question block
_RUBRIC_SECTION_HEADERS = [
    "rubric", "marking scheme", "ideal answer", "model answer",
    "answer key", "acceptable", "acceptable variations",
    "key points", "expected answer", "must include",
    "given", "formula", "substitution", "final answer",  # step-based
    "fill in", "passive voice", "correction",             # grammar-style
]


def parse_rubric(raw_text: str) -> dict:
    """
    Parses faculty rubric / marking scheme text into structured question-wise JSON.

    Handles 4 real-world faculty rubric formats:
    A) Bullet-style:   "● Uses sunlight (1)"
    B) Ideal answer:   "Ideal Answer: H₂O  |  Acceptable: H2O"
    C) Step-based:     "Given: ...  Formula: ...  Final Answer: ..."
    D) Grammar-style:  "Fill in the blank / Passive voice correction"

    Returns:
    {
      "Q1": {
        "max_marks": 5,
        "keywords": [],
        "expected_concepts": ["Uses sunlight", "Produces oxygen"],
        "formula_rules": [],
        "partial_credit_rules": []
      }
    }
    """
    text = clean_ocr_text(raw_text)
    structured = {}
    boundaries = _find_question_boundaries(text)

    if len(boundaries) < 2:
        logger.warning("No multi-question rubric structure. Treating entire doc as Q1.")
        structured["Q1"] = _extract_rubric_block(text)
        return structured

    for idx, (q_num, start) in enumerate(boundaries):
        end = boundaries[idx + 1][1] if idx + 1 < len(boundaries) else len(text)
        block = text[start:end].strip()
        structured[q_num] = _extract_rubric_block(block)
        logger.info(f"Parsed rubric {q_num}: marks={structured[q_num]['max_marks']} | rules={len(structured[q_num]['expected_concepts'])}")

    return structured


def _find_question_boundaries(text: str) -> list:
    """Reuse same boundary logic as parse_question_paper for consistency."""
    pattern = re.compile(
        r"""(?mx)^[ \t]*(?:Q\.?\s*(\d+)[\.\)\:\-]|Question\s+(\d+)\s*[:\-\.]?|(\d+)[\.\)][ \t])""",
        re.VERBOSE | re.MULTILINE
    )
    boundaries = []
    seen = set()
    for match in pattern.finditer(text):
        num = match.group(1) or match.group(2) or match.group(3)
        if num and f"Q{num}" not in seen:
            boundaries.append((f"Q{num}", match.start()))
            seen.add(f"Q{num}")
    return boundaries


def _extract_rubric_block(block: str) -> dict:
    """
    Master rubric block extractor.
    Detects the block's dominant style and dispatches to the right handler.
    """
    payload = {
        "max_marks": 0,
        "keywords": [],
        "expected_concepts": [],
        "formula_rules": [],
        "partial_credit_rules": []
    }

    # --- Always try to get max marks ---
    payload["max_marks"] = _extract_max_marks(block)

    # --- Detect dominant style and extract accordingly ---
    block_lower = block.lower()

    # Style A: Bullet-point rubric items
    if re.search(r'^[•●\-\*]\s+', block, re.MULTILINE):
        _extract_bullet_style(block, payload)

    # Style B: Ideal answer / acceptable variations
    if any(h in block_lower for h in ["ideal answer", "acceptable", "model answer", "expected answer"]):
        _extract_ideal_answer_style(block, payload)

    # Style C: Step-based (Given / Formula / Substitution / Final Answer)
    if any(h in block_lower for h in ["given:", "formula:", "substitution:", "final answer:"]):
        _extract_step_based_style(block, payload)

    # Style D: Grammar / fill-in-the-blank style
    if any(h in block_lower for h in ["fill in", "passive voice", "correction", "blank"]):
        _extract_grammar_style(block, payload)

    # --- Keyword extraction (works across all styles) ---
    _extract_keywords(block, payload)

    # --- Partial credit rules ---
    pc_matches = re.findall(
        r'(?:partial\s*credit|award\s*marks?\s*if|deduct\s*marks?\s*if|award\s*\d+\s*marks?\s*if)\s*[:=]?\s*(.*?)(?:\n|$)',
        block, re.IGNORECASE
    )
    payload["partial_credit_rules"] = [pc.strip() for pc in pc_matches if pc.strip()]

    # --- Fallback: dump entire block if nothing was extracted ---
    if not payload["expected_concepts"] and not payload["keywords"] and not payload["formula_rules"]:
        logger.warning("No rubric structure detected. Storing raw lines as expected_concepts fallback.")
        # Filter out section header lines — they add noise as concepts
        _HEADER_PATTERN = re.compile(
            r'^[ \t]*(?:Rubric|Ideal Answer|Acceptable|Model Answer|Marking|Given|Formula|'
            r'Substitution|Final Answer|Note|Answer Key|Expected|Hint|Solution)'
            r'(?:\s*\([^)]*\))?\s*[:\uff1a]?\s*$',
            re.IGNORECASE
        )
        payload["expected_concepts"] = [
            line.strip() for line in block.split('\n')
            if len(line.strip()) > 4 and not _HEADER_PATTERN.match(line.strip())
        ][:8]  # cap at 8 lines

    return payload


def _extract_bullet_style(block: str, payload: dict):
    """
    Style A: Extract bullet-point rubric items.
    e.g.  "● Uses sunlight (1)"                    →  concept, mark=1
          "• Formula: Speed = Distance / Time"      →  formula concept (label kept for rule_utils)
          "• Substitution: 60 / 2 = 30"            →  NOT truncated at trailing 30
    """
    items = extract_bullet_items(block)
    for item in items:
        # Extract trailing (N) or [N] mark notation
        mark = extract_marks_from_line(item)
        # Remove trailing (N) or [N marks] — but NOT bare digits after '=' (formula results)
        clean = re.sub(r'[\(\[]\s*\d+\s*(?:marks?)?\s*[\)\]]$', '', item).strip()
        # SAFE trailing-digit strip: only strip a bare digit that follows a word/letter
        # (not when preceded by '=' or '/' which means it's a calculation result)
        clean = re.sub(r'(?<=[a-zA-Z\u0900-\u097F])\s+\d+$', '', clean).strip()
        if clean and len(clean) > 2:
            payload["expected_concepts"].append(clean)




def _extract_ideal_answer_style(block: str, payload: dict):
    """
    Style B: Extracts ideal/acceptable/model answers.
    Items from 'Acceptable Variations' sections are tagged with '[AV]'
    so that classify_rule_type() in rule_utils.py marks them correctly.
    """
    # Ideal / model / expected → Exact Match
    ideal_patterns = [
        r'(?:Ideal\s*Answer|Model\s*Answer|Expected\s*Answer)(?:\s*\([^)]*\))?\s*[:：]\s*(.*?)(?:\n|$)',
    ]
    for pat in ideal_patterns:
        for m in re.finditer(pat, block, re.IGNORECASE):
            value = m.group(1).strip()
            if not value:
                # Value on the NEXT line (bullet below empty label)
                after = block[m.end():].strip().split('\n')[0]
                value = re.sub(r'^[•●\-\*]\s*', '', after).strip()
            if value:
                for item in re.split(r'[,|]', value):
                    item = item.strip().lstrip('•● ').strip()
                    if item and len(item) > 1:
                        payload["expected_concepts"].append(item)

    # Acceptable Variations → tag with [AV] for classifier
    av_patterns = [
        r'(?:Acceptable(?:\s*Variations?)?|Also\s*Accept|Accept)\s*[:：]\s*(.*?)(?:\n|$)',
    ]
    for pat in av_patterns:
        for m in re.finditer(pat, block, re.IGNORECASE):
            value = m.group(1).strip()
            for item in re.split(r'[,|]', value):
                item = item.strip().lstrip('•● ').strip()
                if item and len(item) > 1:
                    payload["expected_concepts"].append(f"[AV] {item}")

    # Scan bullet lines under section headers when value is on separate lines
    _extract_section_bullets(block, r'Ideal\s*Answer|Model\s*Answer|Expected\s*Answer',
                             payload, tag=None)
    _extract_section_bullets(block, r'Acceptable(?:\s*Variations?)?|Also\s*Accept|Accept',
                             payload, tag='[AV]')



def _extract_step_based_style(block: str, payload: dict):
    """
    Style C: Extracts STANDALONE step-based label lines (non-bullet).
    Only fires on lines that are NOT preceded by a bullet marker.
    Stops before 'Ideal Answer:', 'Rubric:', and similar section headers.

    e.g.  "Given: P = 1000, R = 5%, T = 2"  → [GIVEN] P = 1000, R = 5%, T = 2
          "Formula: F = ma"                  → [FORMULA] F = ma  (only if non-bullet)

    Bullet-embedded steps like "• Formula: Speed = Distance / Time" are
    handled by _extract_bullet_style + rubric_to_rules label stripping.
    """
    STOP_HEADERS_RE = re.compile(
        r'^(?:Ideal\s*Answer|Rubric|Acceptable|Model\s*Answer|'
        r'Expected|Marking|Answer\s*Key|Note|Hint)\s*[:：]',
        re.IGNORECASE
    )
    STEP_LABEL_RE = re.compile(
        r'^(?P<label>Final\s*Answer|Substitution|Formula|Given|Solution|Working)\s*[:：]\s*(?P<value>.+)',
        re.IGNORECASE
    )

    for line in block.split('\n'):
        stripped = line.strip()
        if not stripped:
            continue

        # Stop at section headers
        if STOP_HEADERS_RE.match(stripped):
            break

        # Skip bullet-prefixed lines (handled by _extract_bullet_style)
        if re.match(r'^[•●\-\*]\s+', stripped):
            continue

        m = STEP_LABEL_RE.match(stripped)
        if not m:
            continue

        label = m.group('label').strip().lower()
        value = m.group('value').strip().strip('"\'"\u201c\u201d').strip()
        if not value or len(value) < 2:
            continue

        if label in ('formula', 'substitution'):
            payload['formula_rules'].append(f'[FORMULA] {value}')
        elif 'final' in label:
            payload['expected_concepts'].append(f'[FINAL] {value}')
        elif label == 'given':
            payload['expected_concepts'].append(f'[GIVEN] {value}')
        else:
            payload['expected_concepts'].append(f'[STEP] {value}')








def _extract_grammar_style(block: str, payload: dict):
    """
    Style D: Grammar / fill-in-the-blank style.
    e.g. "Correct form: 'was playing'"
    """
    grammar_labels = [
        "Correct Form", "Correct Answer", "Correction",
        "Fill in the blank", "Answer", "Expected"
    ]
    for label in grammar_labels:
        m = re.search(rf'{label}\s*[:：]\s*(.*?)(?:\n|$)', block, re.IGNORECASE)
        if m:
            value = m.group(1).strip()
            if value:
                payload["expected_concepts"].append(value)


def _extract_keywords(block: str, payload: dict):
    """Extracts explicitly labeled keywords."""
    kw = re.search(
        r'(?:keywords?|key\s*terms?|must\s*include|must\s*mention)\s*[:=]\s*(.*?)(?:\n|$)',
        block, re.IGNORECASE
    )
    if kw:
        payload["keywords"] = [k.strip() for k in kw.group(1).split(",") if k.strip()]


def _extract_max_marks(block: str) -> int:
    """Tries multiple patterns to find max marks for this question block."""
    patterns = [
        r'(?:max(?:imum)?\s*marks?|total\s*marks?)\s*[:=]?\s*(\d+)',
        r'\bmarks?\s*[:=]\s*(\d+)',
        r'\[(\d+)\s*marks?\]',
        r'\((\d+)\s*marks?\)',
    ]
    for pat in patterns:
        m = re.search(pat, block, re.IGNORECASE)
        if m:
            return int(m.group(1))

    # Infer: sum up per-bullet trailing (1), (2) annotations
    # Only trust this if at least 2 bullets have marks (avoids bad single-match inference)
    bullet_marks = re.findall(r'[•●\-\*][^(\n]+\((\d+)\)', block)
    if len(bullet_marks) >= 2:
        return sum(int(x) for x in bullet_marks)

    return 0


def _extract_section_bullets(block: str, section_header_re: str, payload: dict, tag=None):
    """
    Finds bullet-point items that appear on the lines IMMEDIATELY AFTER
    a section header (like 'Ideal Answer:' or 'Acceptable:'), and adds
    them to payload['expected_concepts'].

    This handles the common faculty format:
      Ideal Answer:
      • H₂O        ← we want this line
      • 30 km/h    ← and this
    """
    header_pat = re.compile(
        rf'(?:{section_header_re})(?:\s*\([^)]*\))?\s*[::\uff1a]\s*$',
        re.IGNORECASE | re.MULTILINE
    )
    for hm in header_pat.finditer(block):
        after_block = block[hm.end():]
        for line in after_block.split('\n'):
            stripped = line.strip()
            if not stripped:
                continue
            # Stop when we hit another section header
            if re.match(r'^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*:', stripped):
                break
            # Extract bullet line
            if re.match(r'^[•●\-\*]\s+', stripped):
                item = re.sub(r'^[•●\-\*]\s+', '', stripped).strip()
                if item and len(item) > 1:
                    payload["expected_concepts"].append(f"{tag} {item}" if tag else item)
