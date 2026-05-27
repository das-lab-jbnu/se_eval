RUBRIC = [
    {
        "id": "clarity",
        "category": "발표 및 전달력",
        "label": "전달의 명확성",
        "description": "청중이 이해하기 쉬운 용어와 논리로 발표했는가?",
        "max_score": 5,
    },
    {
        "id": "attitude",
        "category": "발표 및 전달력",
        "label": "발표 태도",
        "description": "대본 없이 당당하며, 목소리 크기가 적절한가?",
        "max_score": 5,
    },
    {
        "id": "time",
        "category": "발표 및 전달력",
        "label": "시간 엄수",
        "description": "발표 7분과 데모 1분 시간을 제한 내에 맞추었는가?",
        "max_score": 5,
    },
    {
        "id": "value",
        "category": "가치 및 완결성",
        "label": "유용성 및 독창성",
        "description": "소프트웨어가 사용자에게 유용한 가치를 제공하는가?",
        "max_score": 5,
    },
    {
        "id": "completeness",
        "category": "가치 및 완결성",
        "label": "기능적 완결성",
        "description": "계획한 핵심 기능들이 안정적으로 동작하며, 시나리오가 완결성 있게 구현되었는가?",
        "max_score": 5,
    },
    {
        "id": "structure",
        "category": "공학적 설계",
        "label": "구조적 설계",
        "description": "폴더, 파일, 클래스 구조가 체계적으로 정리되었는가?",
        "max_score": 5,
    },
    {
        "id": "se_principles",
        "category": "공학적 설계",
        "label": "SE 원리 활용",
        "description": "소프트웨어 공학 개념이 반영되었는가?",
        "max_score": 5,
    },
    {
        "id": "readability",
        "category": "공학적 설계",
        "label": "코드 가독성",
        "description": "변수명, 주석, 스타일 등 타인이 읽기 좋게 작성되었는가?",
        "max_score": 5,
    },
    {
        "id": "demo",
        "category": "시연 및 종합",
        "label": "데모의 효과성",
        "description": "1분 영상이 프로그램의 핵심 기능을 잘 증명했는가?",
        "max_score": 5,
    },
    {
        "id": "challenge",
        "category": "시연 및 종합",
        "label": "기술적 도전",
        "description": "충분히 고민하고 노력한 과제인가?",
        "max_score": 5,
    },
]

RUBRIC_IDS = {item["id"] for item in RUBRIC}
