import re
import os
from typing import List, Dict, Any, Optional

# ─── Stopwords for keyword extraction ─────────────────────────────────────────
STOPWORDS = {
    "a","an","the","is","are","was","were","be","been","being","have","has","had",
    "do","does","did","will","would","could","should","may","might","shall","can",
    "to","of","in","for","on","with","at","by","from","up","about","into","through",
    "during","before","after","above","below","and","or","but","not","so","yet","as",
    "it","its","this","that","these","those","i","we","you","he","she","they",
    "what","which","who","how","when","where","why","all","each","both","few",
    "more","most","other","some","such","any","than","too","very","just",
    "part","whole","called","known","used","made","given","taken","put","set",
    "how","can","also","using","gives","give","makes","make","being"
}

# ─── Question type detection ───────────────────────────────────────────────────
QUESTION_TYPE_PATTERNS = [
    (r'\bwhat\s+is\b',          "definition"),
    (r'\bdefine\b',             "definition"),
    (r'\bmeaning\s+of\b',       "definition"),
    (r'\bwhat\s+are\b',         "definition"),
    (r'\bexplain\b',            "explanation"),
    (r'\bdescribe\b',           "explanation"),
    (r'\bhow\s+does\b',         "explanation"),
    (r'\bwhy\b',                "reasoning"),
    (r'\bgive\s+reason\b',      "reasoning"),
    (r'\bdifference\b',         "comparison"),
    (r'\bcompare\b',            "comparison"),
    (r'\bcontrast\b',           "comparison"),
    (r'\bcalculate\b',          "numerical"),
    (r'\bsolve\b',              "numerical"),
    (r'\bfind\s+the\b',         "numerical"),
    (r'\blist\b',               "listing"),
    (r'\bname\b',               "listing"),
    (r'\bstate\b',              "short_concept"),
    (r'\bwrite\b',              "short_concept"),
]

def detect_question_type(question_text: str) -> str:
    q = question_text.lower()
    for pattern, qtype in QUESTION_TYPE_PATTERNS:
        if re.search(pattern, q):
            return qtype
    return "short_concept"


# ─── Keyword extraction ────────────────────────────────────────────────────────
def extract_keywords(text: str) -> List[str]:
    """Extract meaningful content words from a rubric point."""
    words = re.findall(r"[a-zA-Z'/-]+", text.lower())
    keywords = []
    seen = set()
    for w in words:
        w_clean = w.strip("'-/")
        if len(w_clean) >= 3 and w_clean not in STOPWORDS and w_clean not in seen:
            keywords.append(w_clean)
            seen.add(w_clean)
    return keywords[:6]  # cap at 6


# ─── Concept meaning generation ───────────────────────────────────────────────
def generate_concept_meaning(point_text: str) -> str:
    """Generate a simple rephrasing of the core concept using Gemini if available."""
    try:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            return point_text  # fallback: use point text itself

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            f"Rephrase the following rubric point into one short sentence describing its core concept meaning "
            f"(max 12 words, simple English, no jargon):\n\n\"{point_text}\""
        )
        response = model.generate_content(prompt)
        return response.text.strip().strip('"')
    except Exception:
        return point_text


# ─── Alternate phrases ─────────────────────────────────────────────────────────
def generate_alternate_phrases(point_text: str) -> List[str]:
    """Generate 2-3 alternate valid phrasing using Gemini."""
    try:
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            return []

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            f"Generate 2-3 alternate ways a school student might write the following idea "
            f"(include Hinglish / simple English variants). Return only a JSON array of strings.\n\n"
            f"Point: \"{point_text}\""
        )
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Extract JSON array
        match = re.search(r'\[.*?\]', text, re.DOTALL)
        if match:
            import json
            return json.loads(match.group())
        return []
    except Exception:
        return []


# ─── Bullet point detection ────────────────────────────────────────────────────
BULLET_CHARS = re.compile(r'^[●•\-\*\u2022\u25cf\u25e6\u2023\u2043]\s*')
MARKS_IN_PARENS = re.compile(r'\((\d+)\)\s*$')

def is_bullet_line(line: str) -> bool:
    return bool(BULLET_CHARS.match(line.strip()))

def strip_bullet(line: str) -> str:
    return BULLET_CHARS.sub('', line.strip()).strip()

def extract_inline_marks(text: str) -> tuple:
    """Extract trailing (N) marks from a bullet point text. Returns (clean_text, marks_or_None)."""
    m = MARKS_IN_PARENS.search(text)
    if m:
        marks = int(m.group(1))
        clean = text[:m.start()].strip()
        return clean, marks
    return text, None


# ─── Question header detection ─────────────────────────────────────────────────
Q_HEADER = re.compile(
    r'^(Q\.?\s*\d+|Question\s*\d+|\d+[\.\)]\s)'
    r'|^\d+$',
    re.IGNORECASE
)

RUBRIC_HEADER = re.compile(
    r'^(rubric|answer|expected answer|model answer|marking criteria|key points?)\s*:?\s*$',
    re.IGNORECASE
)

def extract_question_number(line: str) -> Optional[int]:
    m = re.search(r'\d+', line)
    return int(m.group()) if m else None

def strip_question_prefix(line: str) -> str:
    line = re.sub(r'^(Q\.?\s*\d+\.?\s*|Question\s*\d+\.?\s*|\d+[\.\)]\s*)', '', line, flags=re.IGNORECASE)
    return line.strip()

def extract_marks_from_line(line: str) -> Optional[int]:
    """Find marks from patterns like [5], (5 marks), 5M, 5 marks."""
    for pat in [
        r'\[(\d+)\]',
        r'\((\d+)\s*marks?\)',
        r'(\d+)\s*marks?',
        r'\((\d+)\)',
        r'(\d+)\s*M\b',
    ]:
        m = re.search(pat, line, re.IGNORECASE)
        if m:
            return int(m.group(1))
    return None


# ─── Pre-processor: split merged OCR lines ─────────────────────────────────────
def split_merged_lines(line_texts: List[str]) -> List[str]:
    """
    Handles the common OCR artifact where question text and rubric points get
    fused onto a single line (e.g. "What is X?Rubric: point1 (2)point2 (2)").
    Splits them back into discrete logical lines before the main parser runs.
    """
    result = []
    INLINE_RUBRIC = re.compile(r'([?!.])?\s*(Rubric|Answer|Expected Answer|Key Points?)\s*:', re.IGNORECASE)
    INLINE_POINT_SPLIT = re.compile(r'(\(\d+\))\s*(?=[A-Z])')

    for line in line_texts:
        m = INLINE_RUBRIC.search(line)
        if m:
            q_part = line[:m.start() + (1 if m.group(1) else 0)].strip()
            rubric_body = line[m.end():].strip()
            if q_part:
                result.append(q_part)
            result.append("Rubric:")
            if rubric_body:
                parts = INLINE_POINT_SPLIT.split(rubric_body)
                i = 0
                while i < len(parts):
                    text_chunk = parts[i].strip()
                    marks_chunk = parts[i + 1].strip() if i + 1 < len(parts) else ''
                    combined = (text_chunk + ' ' + marks_chunk).strip()
                    if combined:
                        result.append('• ' + combined)
                    i += 2
                if len(parts) % 2 == 1 and parts[-1].strip():
                    result.append('• ' + parts[-1].strip())
        else:
            result.append(line)
    return result


# ─── Main parser ───────────────────────────────────────────────────────────────
def structure_teacher_document(line_texts: List[str], use_ai_enrichment: bool = True) -> Dict[str, Any]:
    """
    Parses OCR lines from a teacher rubric into a structured academic JSON format.

    Output schema per question:
    {
      "question_number": 1,
      "question_text": "...",
      "question_type": "definition",
      "max_marks": 5,
      "rubric_points": [
        {
          "type": "concept_point",
          "point": "...",
          "marks": 2,
          "keywords": [...],
          "alternate_phrases": [...],
          "concept_meaning": "..."
        }
      ]
    }
    """
    # Pre-process: separate any OCR lines where question and rubric were merged
    line_texts = split_merged_lines(line_texts)

    questions = []
    current_q = None
    in_rubric_section = False
    pending_bullets = []

    def flush_question():
        nonlocal current_q, pending_bullets
        if current_q is None:
            return
        # Process all accumulated bullets for the current question
        for b_text in pending_bullets:
            point_text, point_marks = extract_inline_marks(b_text)
            if not point_text:
                continue
            kws = extract_keywords(point_text)
            point_obj = {
                "type": "concept_point",
                "point": point_text,
                "marks": point_marks,
                "keywords": kws,
                "alternate_phrases": [],
                "concept_meaning": point_text  # default; enriched below if AI available
            }
            if use_ai_enrichment:
                point_obj["concept_meaning"] = generate_concept_meaning(point_text)
                point_obj["alternate_phrases"] = generate_alternate_phrases(point_text)

            current_q["rubric_points"].append(point_obj)

        # If no inline marks per point, try to distribute max_marks proportionally
        if current_q["max_marks"] and current_q["rubric_points"]:
            unset = [p for p in current_q["rubric_points"] if p["marks"] is None]
            if unset:
                # assign equal share of remaining marks
                set_marks = sum(p["marks"] or 0 for p in current_q["rubric_points"] if p["marks"])
                remaining = (current_q["max_marks"] or 0) - set_marks
                per_point = round(remaining / len(unset), 1) if unset else 0
                for p in unset:
                    p["marks"] = int(per_point) if per_point == int(per_point) else per_point

        questions.append(current_q)
        current_q = None
        pending_bullets = []
        in_rubric_section = False

    for raw_line in line_texts:
        line = raw_line.strip()
        if not line:
            continue

        # ── Detect question header ─────────────────────────────────────────────
        if Q_HEADER.match(line):
            flush_question()
            in_rubric_section = False
            q_num = extract_question_number(line)
            q_text = strip_question_prefix(line)
            # Remove trailing marks notation from question text
            q_marks = extract_marks_from_line(q_text)
            q_text_clean = re.sub(
                r'\s*(\[[\d\s]+\]|\([\d\s]+\s*marks?\)|\d+\s*marks?|\([\d]+\))\s*$',
                '', q_text, flags=re.IGNORECASE
            ).strip()
            current_q = {
                "question_number": q_num,
                "question_text": q_text_clean,
                "question_type": detect_question_type(q_text_clean),
                "max_marks": q_marks,
                "rubric_points": []
            }
            continue

        if current_q is None:
            continue

        # ── Detect rubric section header ───────────────────────────────────────
        if RUBRIC_HEADER.match(line):
            in_rubric_section = True
            continue

        # ── Extract marks from a standalone marks line ─────────────────────────
        marks_only = re.match(r'^\(?(\d+)\s*marks?\)?$', line, re.IGNORECASE)
        if marks_only:
            if current_q["max_marks"] is None:
                current_q["max_marks"] = int(marks_only.group(1))
            continue

        # ── Bullet point ───────────────────────────────────────────────────────
        if is_bullet_line(line):
            pending_bullets.append(strip_bullet(line))
            continue

        # ── Inline marks detection for question text (e.g. "What is X? (5 marks)") ─
        if current_q["max_marks"] is None:
            m = extract_marks_from_line(line)
            if m:
                current_q["max_marks"] = m
                # This line might be a continuation of the question text
                clean = re.sub(
                    r'\s*(\[[\d\s]+\]|\([\d\s]+\s*marks?\)|\d+\s*marks?)\s*$',
                    '', line, flags=re.IGNORECASE
                ).strip()
                if clean and clean.lower() not in current_q["question_text"].lower():
                    current_q["question_text"] += " " + clean
                continue

        # ── Non-bullet body line ───────────────────────────────────────────────
        # If we're in rubric section and no bullet prefix, treat as rubric content
        if in_rubric_section and len(line) > 5:
            pending_bullets.append(line)

    flush_question()  # Don't forget the last question

    return {
        "document_type": "teacher",
        "questions": questions
    }
