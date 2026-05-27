from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .google_sheets import forward_to_google_apps_script
from .rubric import RUBRIC
from .schemas import EvaluationCreate, PresentationCreate
from .storage import (
    ROOT_DIR,
    append_evaluation,
    build_summary,
    create_session,
    load_current_session,
    load_students,
)

app = FastAPI(title="SE Evaluation System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = ROOT_DIR / "frontend"
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def admin_page() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/judge")
def judge_page() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "judge.html")


@app.get("/professor")
def professor_page() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "professor.html")


@app.get("/api/rubric")
def get_rubric() -> list[dict]:
    return RUBRIC


@app.get("/api/students")
def get_students() -> dict[str, list[str]]:
    return load_students()


@app.post("/api/presentations/select")
def select_presentation(payload: PresentationCreate) -> dict:
    try:
        return create_session(payload.class_id, payload.presenter_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/presentations/current")
def get_current_presentation() -> dict:
    session = load_current_session()
    if not session:
        raise HTTPException(status_code=404, detail="현재 선택된 발표자가 없습니다.")
    return session


@app.post("/api/evaluations")
async def submit_evaluation(payload: EvaluationCreate) -> dict:
    stored = append_evaluation(payload.model_dump())
    await forward_to_google_apps_script(stored)
    return {"ok": True, "evaluation": stored}


@app.get("/api/summary")
def get_summary(
    class_id: str = Query(...),
    presenter_name: str = Query(...),
) -> dict:
    return build_summary(class_id, presenter_name)
