const STORAGE_KEYS = {
  session: "se_eval_current_session",
  evaluations: "se_eval_evaluations",
};

const RUBRIC = [
  ["clarity", "발표 및 전달력", "전달의 명확성", "청중이 이해하기 쉬운 용어와 논리로 발표했는가?"],
  ["attitude", "발표 및 전달력", "발표 태도", "대본 없이 당당하며, 목소리 크기가 적절한가?"],
  ["time", "발표 및 전달력", "시간 엄수", "발표 7분과 데모 1분 시간을 제한 내에 맞추었는가?"],
  ["value", "가치 및 완결성", "유용성 및 독창성", "소프트웨어가 사용자에게 유용한 가치를 제공하는가?"],
  ["completeness", "가치 및 완결성", "기능적 완결성", "핵심 기능들이 안정적으로 동작하며, 시나리오가 완결성 있게 구현되었는가?"],
  ["structure", "공학적 설계", "구조적 설계", "폴더, 파일, 클래스 구조가 체계적으로 정리되었는가?"],
  ["se_principles", "공학적 설계", "SE 원리 활용", "소프트웨어 공학 개념이 반영되었는가?"],
  ["readability", "공학적 설계", "코드 가독성", "변수명, 주석, 스타일 등 타인이 읽기 좋게 작성되었는가?"],
  ["demo", "시연 및 종합", "데모의 효과성", "1분 영상이 프로그램의 핵심 기능을 잘 증명했는가?"],
  ["challenge", "시연 및 종합", "기술적 도전", "충분히 고민하고 노력한 과제인가?"],
].map(([id, category, label, description]) => ({ id, category, label, description }));

const rubricIds = RUBRIC.map((item) => item.id);

function appsScriptUrl() {
  return window.SE_EVAL_CONFIG?.APPS_SCRIPT_URL?.trim();
}

async function request(action, payload = {}) {
  const url = appsScriptUrl();
  if (!url) return localRequest(action, payload);

  if (action.startsWith("get")) {
    const params = new URLSearchParams({ action, ...payload });
    const response = await fetch(`${url}?${params}`);
    return parseResponse(response);
  }

  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify({ action, ...payload }),
  });
  return parseResponse(response);
}

async function parseResponse(response) {
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "요청을 처리하지 못했습니다.");
  }
  return data;
}

async function localRequest(action, payload) {
  if (action === "getStudents") return fetchJson("./data/students.json");
  if (action === "getRubric") return { rubric: RUBRIC };
  if (action === "getCurrentSession") {
    const session = readLocal(STORAGE_KEYS.session);
    if (!session) throw new Error("현재 선택된 발표자가 없습니다.");
    return { session };
  }
  if (action === "selectPresentation") {
    const students = await fetchJson("./data/students.json");
    const candidates = students[payload.class_id].filter((name) => name !== payload.presenter_name);
    const session = {
      class_id: payload.class_id,
      presenter_name: payload.presenter_name,
      judges: shuffle(candidates).slice(0, 10),
      created_at: new Date().toISOString(),
    };
    writeLocal(STORAGE_KEYS.session, session);
    return { session };
  }
  if (action === "submitEvaluation") {
    const evaluations = readLocal(STORAGE_KEYS.evaluations) || [];
    const stored = {
      ...payload.evaluation,
      total_score: totalScore(payload.evaluation.scores),
      submitted_at: new Date().toISOString(),
    };
    const next = evaluations.filter(
      (item) =>
        !(
          item.class_id === stored.class_id &&
          item.presenter_name === stored.presenter_name &&
          item.evaluator_role === stored.evaluator_role &&
          item.evaluator_name === stored.evaluator_name
        ),
    );
    next.push(stored);
    writeLocal(STORAGE_KEYS.evaluations, next);
    return { evaluation: stored };
  }
  if (action === "getSummary") {
    const evaluations = (readLocal(STORAGE_KEYS.evaluations) || []).filter(
      (item) => item.class_id === payload.class_id && item.presenter_name === payload.presenter_name,
    );
    return { summary: buildSummary(payload.class_id, payload.presenter_name, evaluations) };
  }
  throw new Error("알 수 없는 요청입니다.");
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path} 파일을 읽지 못했습니다.`);
  return response.json();
}

function readLocal(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function totalScore(scores) {
  return rubricIds.reduce((sum, id) => sum + Number(scores[id] || 0), 0);
}

function trimmedMean(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const trimmed = ordered.length >= 3 ? ordered.slice(1, -1) : ordered;
  return round(trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length);
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function buildSummary(classId, presenterName, evaluations) {
  const studentScores = evaluations.filter((item) => item.evaluator_role === "student").map((item) => item.total_score);
  const professorScores = evaluations
    .filter((item) => item.evaluator_role === "professor")
    .map((item) => item.total_score);
  const studentTrimmedMean = trimmedMean(studentScores);
  const professorAverage = professorScores.length
    ? round(professorScores.reduce((sum, value) => sum + value, 0) / professorScores.length)
    : null;
  const finalScore =
    studentTrimmedMean !== null && professorAverage !== null ? round(studentTrimmedMean * 0.5 + professorAverage * 0.5) : null;

  return {
    class_id: classId,
    presenter_name: presenterName,
    student_evaluation_count: studentScores.length,
    professor_evaluation_count: professorScores.length,
    student_trimmed_mean: studentTrimmedMean,
    professor_average: professorAverage,
    final_score: finalScore,
  };
}

function setMessage(message, type = "info") {
  const target = document.querySelector("[data-message]");
  if (!target) return;
  target.textContent = message;
  target.dataset.type = type;
}

function scoreFields(rubric) {
  return rubric
    .map(
      (item) => `
        <fieldset class="criterion">
          <legend>
            <span>${item.label}</span>
            <small>${item.category}</small>
          </legend>
          <p>${item.description}</p>
          <div class="score-options">
            ${[1, 2, 3, 4, 5]
              .map(
                (score) => `
                  <label>
                    <input required type="radio" name="${item.id}" value="${score}">
                    <span>${score}</span>
                  </label>
                `,
              )
              .join("")}
          </div>
        </fieldset>
      `,
    )
    .join("");
}

function collectScores(form) {
  const scores = {};
  for (const id of rubricIds) {
    const checked = form.querySelector(`input[name="${id}"]:checked`);
    if (!checked) throw new Error("모든 항목에 점수를 입력해주세요.");
    scores[id] = Number(checked.value);
  }
  return scores;
}

async function initAdmin() {
  const students = await request("getStudents");
  const classSelect = document.querySelector("#classId");
  const presenterSelect = document.querySelector("#presenterName");
  const judgeList = document.querySelector("#judgeList");
  const summaryBox = document.querySelector("#summary");

  classSelect.innerHTML = Object.keys(students)
    .map((classId) => `<option value="${classId}">${classId}분반</option>`)
    .join("");

  function renderPresenters() {
    presenterSelect.innerHTML = students[classSelect.value].map((name) => `<option value="${name}">${name}</option>`).join("");
  }

  async function refreshCurrent() {
    try {
      const { session } = await request("getCurrentSession");
      judgeList.innerHTML = session.judges.map((name) => `<li>${name}</li>`).join("");
      const { summary } = await request("getSummary", {
        class_id: session.class_id,
        presenter_name: session.presenter_name,
      });
      summaryBox.innerHTML = `
        <strong>${session.class_id}분반 ${session.presenter_name}</strong>
        <span>학생 평가 ${summary.student_evaluation_count}/10</span>
        <span>교수 평가 ${summary.professor_evaluation_count}</span>
        <span>학생 절단 평균 ${summary.student_trimmed_mean ?? "-"}</span>
        <span>교수 평균 ${summary.professor_average ?? "-"}</span>
        <span>최종 ${summary.final_score ?? "-"}/50</span>
      `;
    } catch (error) {
      judgeList.innerHTML = "";
      summaryBox.textContent = error.message;
    }
  }

  classSelect.addEventListener("change", renderPresenters);
  document.querySelector("#selectForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const { session } = await request("selectPresentation", {
        class_id: classSelect.value,
        presenter_name: presenterSelect.value,
      });
      judgeList.innerHTML = session.judges.map((name) => `<li>${name}</li>`).join("");
      setMessage("발표자와 심사위원 10명을 선정했습니다.", "success");
      await refreshCurrent();
    } catch (error) {
      setMessage(error.message, "error");
    }
  });

  renderPresenters();
  await refreshCurrent();
  setInterval(refreshCurrent, 5000);
}

async function initEvaluation(role) {
  try {
    const [{ rubric }, { session }] = await Promise.all([request("getRubric"), request("getCurrentSession")]);
    const form = document.querySelector("#evaluationForm");
    document.querySelector("#presenter").textContent = `${session.class_id}분반 ${session.presenter_name}`;
    document.querySelector("#criteria").innerHTML = scoreFields(rubric);

    const evaluatorField = document.querySelector("#evaluatorName");
    if (role === "student") {
      evaluatorField.innerHTML = session.judges.map((name) => `<option value="${name}">${name}</option>`).join("");
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await request("submitEvaluation", {
          evaluation: {
            evaluator_role: role,
            evaluator_name: evaluatorField.value,
            class_id: session.class_id,
            presenter_name: session.presenter_name,
            scores: collectScores(form),
            comment: form.comment.value.trim(),
          },
        });
        form.reset();
        setMessage("평가가 저장되었습니다.", "success");
      } catch (error) {
        setMessage(error.message, "error");
      }
    });
  } catch (error) {
    setMessage(error.message, "error");
  }
}

window.seEval = { initAdmin, initEvaluation };
