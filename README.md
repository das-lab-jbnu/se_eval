# SE 평가 시스템

파이썬 최종 프로젝트 발표 평가를 위한 간단한 평가 시스템입니다.

현재는 두 가지 방식으로 실행할 수 있습니다.

- `docs/`: GitHub Pages에 올리는 정적 프론트 버전
- `backend/`: 로컬 FastAPI 백엔드 버전

## GitHub Pages 배포

GitHub Pages에는 서버 코드를 실행할 수 없기 때문에 `docs/` 폴더를 정적 웹앱으로 사용합니다.

1. GitHub에 저장소를 만들고 이 프로젝트를 push합니다.
2. GitHub 저장소에서 `Settings`로 이동합니다.
3. 왼쪽 메뉴에서 `Pages`를 선택합니다.
4. `Build and deployment`에서 `Source`를 `Deploy from a branch`로 선택합니다.
5. `Branch`는 `main`, 폴더는 `/docs`로 선택하고 저장합니다.
6. 몇 분 뒤 표시되는 Pages URL로 접속합니다.

## GitHub Pages 파일

- `docs/index.html`: 운영자 페이지
- `docs/judge.html`: 학생 평가 페이지
- `docs/professor.html`: 교수 평가 페이지
- `docs/data/students.json`: 학생 목록
- `docs/config.js`: Google Apps Script URL 설정

`docs/config.js`의 `APPS_SCRIPT_URL`이 비어 있으면 브라우저의 `localStorage`에만 저장되는 데모 모드로 동작합니다. 실제 수업에서 여러 학생이 각자 접속하려면 Google Apps Script URL을 연결해야 합니다.

## Google Apps Script 연결

1. Google Sheets를 새로 만듭니다.
2. 메뉴에서 `확장 프로그램` > `Apps Script`를 엽니다.
3. [scripts/Code.gs](c:/Users/sandi/OneDrive/Documents/dev/se_eval/scripts/Code.gs)의 내용을 Apps Script 편집기에 붙여넣습니다.
4. `배포` > `새 배포`를 누릅니다.
5. 유형은 `웹 앱`으로 선택합니다.
6. 실행 권한은 본인, 액세스 권한은 `모든 사용자`로 설정합니다.
7. 배포 후 생성된 웹 앱 URL을 복사합니다.
8. `docs/config.js`의 `APPS_SCRIPT_URL`에 붙여넣고 GitHub에 push합니다.

## Google Sheet 탭

Apps Script는 아래 탭을 자동으로 만듭니다.

- `current_session`: 현재 발표자와 심사위원 10명
- `evaluations`: 학생/교수의 개별 평가 원자료
- `final_scores`: 발표자별 학생 절단 평균, 교수 평균, 최종 점수

`final_scores`는 발표자 선택 또는 평가 제출이 발생할 때마다 자동 갱신됩니다.

## 로컬 FastAPI 실행

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn backend.app.main:app --reload
```

브라우저에서 `http://127.0.0.1:8000`으로 접속합니다.

## 평가 방식

- 학생 심사위원 10명을 발표자 제외 후 랜덤 선정합니다.
- 학생 평가는 최고점과 최저점을 제외한 절단 평균을 사용합니다.
- 교수 평가는 평균을 사용합니다.
- 최종 점수는 학생 절단 평균 50%, 교수 평균 50%로 계산합니다.
