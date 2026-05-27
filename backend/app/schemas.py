from pydantic import BaseModel, Field, field_validator

from .rubric import RUBRIC_IDS


class PresentationCreate(BaseModel):
    class_id: str
    presenter_name: str


class EvaluationCreate(BaseModel):
    evaluator_role: str = Field(pattern="^(student|professor)$")
    evaluator_name: str = Field(min_length=1)
    class_id: str
    presenter_name: str
    scores: dict[str, int]
    comment: str = ""

    @field_validator("scores")
    @classmethod
    def validate_scores(cls, scores: dict[str, int]) -> dict[str, int]:
        missing = RUBRIC_IDS - set(scores)
        unknown = set(scores) - RUBRIC_IDS
        if missing:
            raise ValueError(f"Missing score fields: {', '.join(sorted(missing))}")
        if unknown:
            raise ValueError(f"Unknown score fields: {', '.join(sorted(unknown))}")
        for criterion, score in scores.items():
            if score < 1 or score > 5:
                raise ValueError(f"{criterion} must be between 1 and 5")
        return scores
