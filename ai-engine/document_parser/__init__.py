# document_parser/__init__.py
# -------------------------------------------------------
# BACKWARDS COMPATIBILITY SHIM
# 
# The canonical location for these modules is now:
#   document_intelligence/extraction/
#   document_intelligence/faculty/
#   document_intelligence/student/
#
# This __init__.py re-exports everything so that existing
# imports (e.g. in test_extract.py) keep working unchanged:
#
#   from document_parser.extract_text import extract_document_text  ✓
#   from document_parser.parse_rubric import parse_rubric            ✓
# -------------------------------------------------------

from document_intelligence.extraction.extract_text import extract_document_text
from document_intelligence.extraction.detect_document_type import detect_document_type
from document_intelligence.faculty.parse_question_paper import parse_question_paper
from document_intelligence.faculty.parse_rubric import parse_rubric
from document_intelligence.student.parse_answer_sheet import parse_answer_sheet
from document_intelligence.student.align_question_answer import align_evaluation_data

__all__ = [
    "extract_document_text",
    "detect_document_type",
    "parse_question_paper",
    "parse_rubric",
    "parse_answer_sheet",
    "align_evaluation_data",
]
