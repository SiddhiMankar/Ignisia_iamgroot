import re
from utils.logger import get_logger

logger = get_logger(__name__)


def parse_rubric(raw_text: str) -> dict:
    """
    Faculty Flow — parses rubric/marking scheme text into structured rubric JSON.

    Returns:
    {
      "Q1": {
        "max_marks": 5,
        "keywords": ["photosynthesis", "chlorophyll"],
        "expected_concepts": ["plants make food"],
        "formula_rules": [],
        "partial_credit_rules": ["award 2 marks if concept explained"]
      }
    }
    """
    structured = {}
    split_pattern = r"(?im)^\s*(?:Q(?:uestion)?\.?\s*)?(\d+)[\.\):\-]?\s*\n?"
    parts = re.split(split_pattern, raw_text.strip())

    if len(parts) <= 1:
        logger.warning("No rubric question boundaries found. Treating as Q1.")
        structured["Q1"] = _extract_rubric_block(raw_text)
        return structured

    for i in range(1, len(parts), 2):
        q_num = f"Q{parts[i].strip()}"
        block = parts[i + 1].strip() if i + 1 < len(parts) else ""
        structured[q_num] = _extract_rubric_block(block)
        logger.info(f"Parsed rubric {q_num}: {list(structured[q_num].keys())}")

    return structured


def _extract_rubric_block(block: str) -> dict:
    payload = {
        "max_marks": 0, "keywords": [], "expected_concepts": [],
        "formula_rules": [], "partial_credit_rules": []
    }

    m = re.search(r"(?:max(?:imum)?\s*marks?|total\s*marks?|marks?)\s*[:=]?\s*(\d+)", block, re.IGNORECASE)
    if m:
        payload["max_marks"] = int(m.group(1))

    kw = re.search(r"(?:keywords?|must\s*include|key\s*terms?)\s*[:=]\s*(.*?)(?:\n|$)", block, re.IGNORECASE)
    if kw:
        payload["keywords"] = [k.strip() for k in kw.group(1).split(",") if k.strip()]

    c = re.search(r"(?:expected\s*concepts?|concepts?|ideas?|key\s*points?)\s*[:=]\s*(.*?)(?:\n|$)", block, re.IGNORECASE)
    if c:
        payload["expected_concepts"] = [x.strip() for x in c.group(1).split(",") if x.strip()]

    f = re.search(r"(?:formula(?:s)?|equation(?:s)?)\s*[:=]\s*(.*?)(?:\n|$)", block, re.IGNORECASE)
    if f:
        payload["formula_rules"] = [x.strip() for x in f.group(1).split(",") if x.strip()]

    pcs = re.findall(r"(?:partial\s*credit|award\s*marks?\s*if|deduct\s*marks?\s*if)\s*[:=]?\s*(.*?)(?:\n|$)", block, re.IGNORECASE)
    payload["partial_credit_rules"] = [pc.strip() for pc in pcs if pc.strip()]

    if not payload["keywords"] and not payload["expected_concepts"]:
        logger.warning("No rubric labels found. Stored raw block as expected_concepts.")
        payload["expected_concepts"] = [block.replace('\n', ' ').strip()]

    return payload
