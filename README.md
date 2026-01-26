# AI 전산 공지 생성기

Google Gemini AI를 활용한 전산 공지 자동 생성 웹 애플리케이션

## 📋 기능

- ✅ 표준 템플릿 기반 전산 공지 자동 생성
- ✅ Google Gemini AI 통합
- ✅ 웹 기반 사용자 인터페이스
- ✅ 클립보드 복사 및 파일 다운로드
- ✅ 반응형 디자인

## 🚀 시작하기

### 1. 필수 요구사항

- Python 3.10 이상
- Google Gemini API 키

### 2. 설치 방법

#### Windows

```bash
# 1. 프로젝트 폴더로 이동
cd ai-notice-generator

# 2. 가상환경 생성
python -m venv venv

# 3. 가상환경 활성화
venv\Scripts\activate

# 4. 패키지 설치
pip install -r requirements.txt
```

#### macOS/Linux

```bash
# 1. 프로젝트 폴더로 이동
cd ai-notice-generator

# 2. 가상환경 생성
python3 -m venv venv

# 3. 가상환경 활성화
source venv/bin/activate

# 4. 패키지 설치
pip install -r requirements.txt
```

### 3. 환경 설정

#### Google Gemini API 키 발급

1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. "Get API Key" 클릭
3. API 키 복사

#### .env 파일 생성

```bash
# .env.example을 .env로 복사
cp .env.example .env
```

`.env` 파일을 열고 API 키 입력:

```env
GEMINI_API_KEY=여기에_발급받은_API_키_입력

HOST=127.0.0.1
PORT=8000
```

### 4. 실행

```bash
python main.py
```

브라우저에서 `http://127.0.0.1:8000` 접속

## 📖 사용 방법

### 1. 기본 정보 입력

- **공지 날짜**: 공지 발행 날짜 선택
- **적용 시스템**: 해당되는 시스템 선택 (복수 선택 가능)

### 2. 업데이트 현황 요약

각 항목의 건수를 입력:
- 업데이트 완료
- 신규 업데이트
- 일부반영 or 구조변경
- 업데이트 예정

### 3. 업데이트 상세 정보 입력

템플릿 형식에 맞춰 업데이트 내용 입력:

```
■ 업데이트 완료
- 넷오피스
  - [개선] 전자결재문서함 검색 기능 개선 (2025.11.06)
    - 배경: 결재 진행 상태 확인 및 특정 문서 검색 편의성 강화
    - 대상: 전사 직원
    - 변경점: 진행상태 필터 및 결재의견 유무 필터 추가
    - 경로: 넷오피스 > 전자결재 시스템 > 상단 상세검색
```

### 4. 말머리 태그 사용

- **[개선]**: 기존 기능을 더 좋게 만드는 경우
- **[개발]**: 기존에 없던 기능이 새로 생긴 경우
- **[수정]**: 오류나 버그를 고친 경우
- **[UI변경]**: 메뉴 위치나 화면 구성이 바뀐 경우

### 5. 공지 생성

"🚀 공지 생성하기" 버튼 클릭

### 6. 결과 활용

- **📋 복사하기**: 클립보드에 복사
- **💾 다운로드**: 텍스트 파일로 저장

## 📁 프로젝트 구조

```
ai-notice-generator/
├── main.py                      # FastAPI 메인 애플리케이션
├── requirements.txt             # Python 패키지 목록
├── .env                         # 환경 변수 (직접 생성)
├── .env.example                 # 환경 변수 예시
├── README.md                    # 사용 설명서
├── templates/
│   └── index.html              # 웹 인터페이스
├── static/
│   ├── css/
│   │   └── style.css           # 스타일시트
│   └── js/
│       └── script.js           # JavaScript
└── notice_templates/
    └── template_structure.json  # 공지 템플릿 구조
```

## 🛠️ 기술 스택

- **Backend**: FastAPI, Python 3.10+
- **AI**: Google Gemini API
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **기타**: Jinja2, python-dotenv

## ⚙️ 커스터마이징

### 템플릿 수정

`notice_templates/template_structure.json` 파일에서 템플릿 구조 수정 가능

### 시스템 추가

JSON 파일의 `systems` 배열에 새로운 시스템 추가:

```json
"systems": [
    "Smart DERP/POS",
    "넷오피스",
    "E-Commerce",
    "새로운 시스템"
]
```

### 포트 변경

`.env` 파일에서 `PORT` 값 변경:

```env
PORT=5000
```

## 🔧 문제 해결

### 가상환경 활성화 오류 (Windows)

PowerShell에서 실행 정책 오류 발생 시:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### API 키 오류

- `.env` 파일에 API 키가 제대로 입력되었는지 확인
- Google AI Studio에서 API 키가 활성화되었는지 확인

### 포트 이미 사용 중 오류

다른 포트 사용:

```bash
# .env 파일 수정 또는
python main.py  # 자동으로 다른 포트 찾음
```

## 📝 주의사항

1. **API 키 보안**: `.env` 파일은 절대 공유하지 마세요
2. **API 사용량**: Gemini API 무료 할당량 확인
3. **네트워크**: 인터넷 연결 필요 (AI API 호출)

## 💡 팁

- 상세한 정보를 제공할수록 더 정확한 공지가 생성됩니다
- "추가 정보" 필드에 특별한 요구사항을 입력할 수 있습니다
- 생성된 공지는 필요에 따라 수정하여 사용하세요

## 📞 지원

문제가 발생하거나 문의사항이 있으면 전산팀에 연락하세요.

---

**Created with ❤️ using FastAPI & Google Gemini**
