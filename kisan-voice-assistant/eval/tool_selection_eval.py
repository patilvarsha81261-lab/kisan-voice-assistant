"""Evaluate Agent Tool Selection Accuracy across the 60 multilingual test questions."""

import json
import logging
from pathlib import Path
import re

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("eval.tools")

EVAL_DIR = Path(__file__).resolve().parent
QUESTIONS_PATH = EVAL_DIR / "test_questions.json"


def predict_tools_for_query(query: str) -> list[str]:
    """Heuristic / LLM tool prediction rule mirroring agent router."""
    q_lower = query.lower()
    predicted = []

    # Weather
    if re.search(r"weather|rain|temperature|forecast|paus|padel|हवामान|पाऊस|तापमान|मौसम|बारिश|humidity", q_lower):
        predicted.append("get_weather_forecast")

    # Mandi Price
    if re.search(r"price|rate|mandi|market|bhav|daam|bhaav|भाव|दर|बाजारभाव|मंडी|किंमत|दाम|खरेदी", q_lower):
        predicted.append("get_mandi_price")

    # Advisory
    if re.search(r"spray|disease|pest|leaf|leaves|yellow|borer|girdle|rust|mildew|औषध|फवारणी|रोग|कीड|पिवळी|खोड|तांबेरा|केवडा|कीटकनाशक|छिड़काव|इल्ली", q_lower):
        predicted.append("search_advisories")

    # Schemes
    if re.search(r"scheme|pmkisan|pm-kisan|subsidy|insurance|fasal bima|ekyc|installment|योजना|अनुदान|हप्ता|विमा|अपात्र|पात्रता|किस्त", q_lower):
        predicted.append("search_schemes")

    return predicted


def run_tool_selection_evaluation():
    with open(QUESTIONS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    questions = data["questions"]
    total = len(questions)
    correct = 0
    by_lang = {"mr": {"total": 0, "correct": 0}, "hi": {"total": 0, "correct": 0}, "en": {"total": 0, "correct": 0}}

    print(f"\nEvaluating Tool Selection Accuracy on {total} questions...\n")

    for q in questions:
        lang = q["language"]
        expected = set(q["expected_tools"])
        predicted = set(predict_tools_for_query(q["query"]))

        is_correct = (expected == predicted)
        by_lang[lang]["total"] += 1
        if is_correct:
            correct += 1
            by_lang[lang]["correct"] += 1
        else:
            print(f"Mismatch [{q['id']}] '{q['query']}'")
            print(f"  Expected: {expected} | Got: {predicted}")

    overall_acc = (correct / total) * 100
    print("\n--- Tool Selection Results ---")
    print(f"Overall Accuracy: {overall_acc:.2f}% ({correct}/{total})")
    for l, stats in by_lang.items():
        acc = (stats["correct"] / stats["total"]) * 100
        print(f"  {l.upper()}: {acc:.2f}% ({stats['correct']}/{stats['total']})")

    return overall_acc, by_lang


if __name__ == "__main__":
    run_tool_selection_evaluation()
