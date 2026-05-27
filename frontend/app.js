const rubricIds = [
  "clarity",
  "attitude",
  "time",
  "value",
  "completeness",
  "structure",
  "se_principles",
  "readability",
  "demo",
  "challenge",
];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "요청을 처리하지 못했습니다.");
  }
  return data;
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
  const students = await api("/api/students");
  const classSelect = document.querySelector("#classId");
  const presenterSelect = document.querySelector("#presenterName");
  const judgeList = document.querySelector("#judgeList");
  const summaryBox = document.querySelector("#summary");

  classSelect.innerHTML = Object.keys(students)
    .filter((classId) => Array.isArray(students[classId]))
    .map((classId) => `<option value="${classId}">${classId}분반</option>`)
    .join("");

  function renderPresenters() {
    presenterSelect.innerHTML = students[classSelect.value]
      .map((name) => `<option value="${name}">${name}</option>`)
      .join("");
  }

  async function refreshCurrent() {
    try {
      const current = await api("/api/presentations/current");
      judgeList.innerHTML = current.judges.map((name) => `<li>${name}</li>`).join("");
      const summary = await api(
        `/api/summary?class_id=${encodeURIComponent(current.class_id)}&presenter_name=${encodeURIComponent(
          current.presenter_name,
        )}`,
      );
      summaryBox.innerHTML = `
        <strong>${current.class_id}분반 ${current.presenter_name}</strong>
        <span>학생 평가 ${summary.student_evaluation_count}/10</span>
        <span>교수 평가 ${summary.professor_evaluation_count}</span>
        <span>학생 절단 평균 ${summary.student_trimmed_mean ?? "-"}</span>
        <span>교수 평균 ${summary.professor_average ?? "-"}</span>
        <span>최종 ${summary.final_score ?? "-"}/50</span>
      `;
    } catch {
      judgeList.innerHTML = "";
      summaryBox.textContent = "아직 선택된 발표자가 없습니다.";
    }
  }

  classSelect.addEventListener("change", renderPresenters);
  document.querySelector("#selectForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const session = await api("/api/presentations/select", {
      method: "POST",
      body: JSON.stringify({
        class_id: classSelect.value,
        presenter_name: presenterSelect.value,
      }),
    });
    judgeList.innerHTML = session.judges.map((name) => `<li>${name}</li>`).join("");
    setMessage("발표자와 심사위원 10명을 선정했습니다.", "success");
    await refreshCurrent();
  });

  renderPresenters();
  await refreshCurrent();
  setInterval(refreshCurrent, 5000);
}

async function initEvaluation(role) {
  const [rubric, current] = await Promise.all([api("/api/rubric"), api("/api/presentations/current")]);
  const form = document.querySelector("#evaluationForm");
  document.querySelector("#presenter").textContent = `${current.class_id}분반 ${current.presenter_name}`;
  document.querySelector("#criteria").innerHTML = scoreFields(rubric);

  const evaluatorSelect = document.querySelector("#evaluatorName");
  if (role === "student") {
    evaluatorSelect.innerHTML = current.judges.map((name) => `<option value="${name}">${name}</option>`).join("");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/evaluations", {
        method: "POST",
        body: JSON.stringify({
          evaluator_role: role,
          evaluator_name: evaluatorSelect.value,
          class_id: current.class_id,
          presenter_name: current.presenter_name,
          scores: collectScores(form),
          comment: form.comment.value.trim(),
        }),
      });
      form.reset();
      setMessage("평가가 저장되었습니다.", "success");
    } catch (error) {
      setMessage(error.message, "error");
    }
  });
}

window.seEval = { initAdmin, initEvaluation };
