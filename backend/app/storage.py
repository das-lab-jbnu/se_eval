from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .rubric import RUBRIC_IDS

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
STUDENTS_PATH = DATA_DIR / "students.json"
SESSION_PATH = DATA_DIR / "current_session.json"
EVALUATIONS_PATH = DATA_DIR / "evaluations.json"


def _read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def load_students() -> dict[str, list[str]]:
    return _read_json(STUDENTS_PATH, {})


def create_session(class_id: str, presenter_name: str) -> dict[str, Any]:
    students = load_students()
    class_students = students.get(class_id, [])
    if presenter_name not in class_students:
        raise ValueError("해당 분반에서 발표자를 찾을 수 없습니다.")

    candidates = [student for student in class_students if student != presenter_name]
    if len(candidates) < 10:
        raise ValueError("심사위원을 10명 선정하려면 발표자 외 학생이 최소 10명 필요합니다.")

    judges = random.sample(candidates, 10)
    session = {
        "class_id": class_id,
        "presenter_name": presenter_name,
        "judges": judges,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_json(SESSION_PATH, session)
    return session


def load_current_session() -> dict[str, Any] | None:
    return _read_json(SESSION_PATH, None)


def append_evaluation(evaluation: dict[str, Any]) -> dict[str, Any]:
    evaluations = _read_json(EVALUATIONS_PATH, [])
    stored = {
        **evaluation,
        "id": len(evaluations) + 1,
        "total_score": sum(evaluation["scores"][criterion] for criterion in RUBRIC_IDS),
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }

    remaining = [
        item
        for item in evaluations
        if not (
            item["class_id"] == stored["class_id"]
            and item["presenter_name"] == stored["presenter_name"]
            and item["evaluator_role"] == stored["evaluator_role"]
            and item["evaluator_name"] == stored["evaluator_name"]
        )
    ]
    remaining.append(stored)
    _write_json(EVALUATIONS_PATH, remaining)
    return stored


def load_evaluations(class_id: str | None = None, presenter_name: str | None = None) -> list[dict[str, Any]]:
    evaluations = _read_json(EVALUATIONS_PATH, [])
    if class_id:
        evaluations = [item for item in evaluations if item["class_id"] == class_id]
    if presenter_name:
        evaluations = [item for item in evaluations if item["presenter_name"] == presenter_name]
    return evaluations


def trimmed_mean(scores: list[float]) -> float | None:
    if not scores:
        return None
    ordered = sorted(scores)
    if len(ordered) >= 3:
        ordered = ordered[1:-1]
    return round(sum(ordered) / len(ordered), 2)


def build_summary(class_id: str, presenter_name: str) -> dict[str, Any]:
    evaluations = load_evaluations(class_id, presenter_name)
    student_scores = [item["total_score"] for item in evaluations if item["evaluator_role"] == "student"]
    professor_scores = [item["total_score"] for item in evaluations if item["evaluator_role"] == "professor"]

    student_average = trimmed_mean(student_scores)
    professor_average = round(sum(professor_scores) / len(professor_scores), 2) if professor_scores else None
    final_score = None
    if student_average is not None and professor_average is not None:
        final_score = round((student_average * 0.5) + (professor_average * 0.5), 2)

    return {
        "class_id": class_id,
        "presenter_name": presenter_name,
        "student_evaluation_count": len(student_scores),
        "professor_evaluation_count": len(professor_scores),
        "student_trimmed_mean": student_average,
        "professor_average": professor_average,
        "final_score": final_score,
        "evaluations": evaluations,
    }
