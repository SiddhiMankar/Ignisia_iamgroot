from utils.logger import get_logger

logger = get_logger(__name__)


def build_rule_builder_json(
    parsed_qp: dict,
    parsed_rubric: dict,
    session_title: str = "OCR Imported Session"
) -> dict:
    """
    Faculty Configuration Flow — Final Step.

    Converts structured parsed outputs from parse_question_paper.py and
    parse_rubric.py into the exact JSON shape expected by the React
    EvaluationSessionBuilder (Rule Builder) form.

    Input:
        parsed_qp     → { "Q1": { "question_text": "...", "marks": 5 } }
        parsed_rubric → { "Q1": { "max_marks": 5, "keywords": [...], ... } }

    Output:
    {
      "sessionTitle": "...",
      "questions": [
        {
          "questionId": "Q1",
          "questionPrompt": "...",
          "marks": 5,
          "rules": [
            { "type": "Keyword Match", "description": "Must mention 'gravity'", "weight": 1 }
          ]
        }
      ]
    }
    """
    questions = []
    all_q_keys = sorted(set(parsed_qp.keys()) | set(parsed_rubric.keys()))

    for qid in all_q_keys:
        qp_data = parsed_qp.get(qid, {})
        rb_data = parsed_rubric.get(qid, {})

        question_prompt = qp_data.get("question_text", "")
        marks = qp_data.get("marks") or rb_data.get("max_marks") or 0
        rules = []

        for kw in rb_data.get("keywords", []):
            rules.append({"type": "Keyword Match", "description": f"Must mention '{kw}'", "weight": 1})

        for concept in rb_data.get("expected_concepts", []):
            rules.append({"type": "Concept Match", "description": concept, "weight": 1})

        for formula in rb_data.get("formula_rules", []):
            rules.append({"type": "Formula Match", "description": formula, "weight": 1})

        for rule in rb_data.get("partial_credit_rules", []):
            rules.append({"type": "Partial Credit", "description": rule, "weight": 1})

        questions.append({
            "questionId": qid,
            "questionPrompt": question_prompt,
            "marks": marks,
            "rules": rules
        })

        logger.info(f"Rule Builder entry: {qid} | marks={marks} | rules={len(rules)}")

    result = {"sessionTitle": session_title, "questions": questions}
    logger.info(f"Faculty config JSON built: {len(questions)} questions, title='{session_title}'")
    return result


def build_from_raw_text(raw_text: str, session_title: str = "OCR Imported Session") -> dict:
    """
    Convenience wrapper: runs both parsers then builds the Rule Builder JSON.
    Useful for pipeline orchestration calls.
    """
    from document_intelligence.faculty.parse_question_paper import parse_question_paper
    from document_intelligence.faculty.parse_rubric import parse_rubric

    parsed_qp = parse_question_paper(raw_text)
    parsed_rubric = parse_rubric(raw_text)
    return build_rule_builder_json(parsed_qp, parsed_rubric, session_title)
