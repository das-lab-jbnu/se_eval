const SHEET_NAMES = {
  session: 'current_session',
  evaluations: 'evaluations',
};

const STUDENTS = {
  '42': [
    '로관진', '고승연', '민권기', '정준범', '고태윤', '이홍민', '최나래', '심이쟁', '허민용', '안재엽',
    '장원호', '강주원', '강지완', '오찬혁', '정지율', '유균상', '이루다', '강석현', '권혁', '정서원',
    '김도균', '서가연', '황은지', '이나라', '김순지', '이준', '전윤탁', '김현진', '윤유현', '박민찬',
    '박태윤', '송민서', '유준석', '이가온', '이현성', '최혜원', '최호형', '강정혁', '여서현', '최보경',
  ],
  '43': [
    '온건', '정지웅', '강민우', '최주연', '허기민', '배선우', '김서현', '최민준', '박신성', '최용혁',
    '정인홍', '최찬빈', '김명준', '전지은', '전재빈', '안건우', '김정훈', '이민석', '김세영', '고세윤',
    '임예린', '장준성', '조희현', '권민성', '김도경', '김민찬', '김선우', '노윤서', '이명준', '조현준',
    '강휘석', '김시윤', '권재영', '소규원', '송정훈', '전세정', '이예진', '김남옥', '임혜윰', '이수민',
  ],
};

const RUBRIC_IDS = [
  'clarity', 'attitude', 'time', 'value', 'completeness',
  'structure', 'se_principles', 'readability', 'demo', 'challenge',
];

const RUBRIC = [
  ['clarity', '발표 및 전달력', '전달의 명확성', '청중이 이해하기 쉬운 용어와 논리로 발표했는가?'],
  ['attitude', '발표 및 전달력', '발표 태도', '대본 없이 당당하며, 목소리 크기가 적절한가?'],
  ['time', '발표 및 전달력', '시간 엄수', '발표 7분과 데모 1분 시간을 제한 내에 맞추었는가?'],
  ['value', '가치 및 완결성', '유용성 및 독창성', '소프트웨어가 사용자에게 유용한 가치를 제공하는가?'],
  ['completeness', '가치 및 완결성', '기능적 완결성', '핵심 기능들이 안정적으로 동작하며, 시나리오가 완결성 있게 구현되었는가?'],
  ['structure', '공학적 설계', '구조적 설계', '폴더, 파일, 클래스 구조가 체계적으로 정리되었는가?'],
  ['se_principles', '공학적 설계', 'SE 원리 활용', '소프트웨어 공학 개념이 반영되었는가?'],
  ['readability', '공학적 설계', '코드 가독성', '변수명, 주석, 스타일 등 타인이 읽기 좋게 작성되었는가?'],
  ['demo', '시연 및 종합', '데모의 효과성', '1분 영상이 프로그램의 핵심 기능을 잘 증명했는가?'],
  ['challenge', '시연 및 종합', '기술적 도전', '충분히 고민하고 노력한 과제인가?'],
].map(([id, category, label, description]) => ({ id, category, label, description }));

function doGet(event) {
  const action = event.parameter.action;
  if (action === 'getStudents') return json(STUDENTS);
  if (action === 'getRubric') return json({ rubric: RUBRIC });
  if (action === 'getCurrentSession') return json({ session: readCurrentSession() });
  if (action === 'getSummary') {
    return json({
      summary: buildSummary(event.parameter.class_id, event.parameter.presenter_name),
    });
  }
  return json({ ok: false, error: '알 수 없는 요청입니다.' });
}

function doPost(event) {
  const body = JSON.parse(event.postData.contents || '{}');
  if (body.action === 'selectPresentation') {
    const session = createSession(body.class_id, body.presenter_name);
    return json({ session });
  }
  if (body.action === 'submitEvaluation') {
    const evaluation = saveEvaluation(body.evaluation);
    return json({ evaluation });
  }
  return json({ ok: false, error: '알 수 없는 요청입니다.' });
}

function createSession(classId, presenterName) {
  const candidates = STUDENTS[classId].filter((name) => name !== presenterName);
  const judges = candidates.sort(() => Math.random() - 0.5).slice(0, 10);
  const session = {
    class_id: classId,
    presenter_name: presenterName,
    judges,
    created_at: new Date().toISOString(),
  };

  const sheet = sheetByName(SHEET_NAMES.session);
  sheet.clear();
  sheet.appendRow(['class_id', 'presenter_name', 'judges_json', 'created_at']);
  sheet.appendRow([classId, presenterName, JSON.stringify(judges), session.created_at]);
  return session;
}

function readCurrentSession() {
  const sheet = sheetByName(SHEET_NAMES.session);
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) throw new Error('현재 선택된 발표자가 없습니다.');
  const row = rows[1];
  return {
    class_id: String(row[0]),
    presenter_name: row[1],
    judges: JSON.parse(row[2]),
    created_at: row[3],
  };
}

function saveEvaluation(evaluation) {
  const sheet = sheetByName(SHEET_NAMES.evaluations);
  ensureEvaluationHeader(sheet);

  const rows = sheet.getDataRange().getValues();
  for (let index = rows.length - 1; index >= 1; index -= 1) {
    const row = rows[index];
    const isSame =
      String(row[0]) === String(evaluation.class_id) &&
      row[1] === evaluation.presenter_name &&
      row[2] === evaluation.evaluator_role &&
      row[3] === evaluation.evaluator_name;
    if (isSame) sheet.deleteRow(index + 1);
  }

  const totalScore = RUBRIC_IDS.reduce((sum, id) => sum + Number(evaluation.scores[id] || 0), 0);
  const stored = {
    ...evaluation,
    total_score: totalScore,
    submitted_at: new Date().toISOString(),
  };

  sheet.appendRow([
    stored.class_id,
    stored.presenter_name,
    stored.evaluator_role,
    stored.evaluator_name,
    ...RUBRIC_IDS.map((id) => stored.scores[id]),
    stored.total_score,
    stored.comment || '',
    stored.submitted_at,
  ]);
  return stored;
}

function buildSummary(classId, presenterName) {
  const evaluations = readEvaluations(classId, presenterName);
  const studentScores = evaluations.filter((item) => item.evaluator_role === 'student').map((item) => item.total_score);
  const professorScores = evaluations.filter((item) => item.evaluator_role === 'professor').map((item) => item.total_score);
  const studentTrimmedMean = trimmedMean(studentScores);
  const professorAverage = professorScores.length ? round(average(professorScores)) : null;
  const finalScore = studentTrimmedMean !== null && professorAverage !== null
    ? round(studentTrimmedMean * 0.5 + professorAverage * 0.5)
    : null;

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

function readEvaluations(classId, presenterName) {
  const sheet = sheetByName(SHEET_NAMES.evaluations);
  ensureEvaluationHeader(sheet);
  return sheet.getDataRange().getValues().slice(1)
    .filter((row) => String(row[0]) === String(classId) && row[1] === presenterName)
    .map((row) => ({
      class_id: String(row[0]),
      presenter_name: row[1],
      evaluator_role: row[2],
      evaluator_name: row[3],
      total_score: Number(row[14]),
    }));
}

function ensureEvaluationHeader(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow([
    'class_id', 'presenter_name', 'evaluator_role', 'evaluator_name',
    ...RUBRIC_IDS, 'total_score', 'comment', 'submitted_at',
  ]);
}

function sheetByName(name) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function trimmedMean(values) {
  if (!values.length) return null;
  const ordered = values.slice().sort((a, b) => a - b);
  const trimmed = ordered.length >= 3 ? ordered.slice(1, -1) : ordered;
  return round(average(trimmed));
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, ...payload }))
    .setMimeType(ContentService.MimeType.JSON);
}
