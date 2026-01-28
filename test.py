from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import google.generativeai as genai
from dotenv import load_dotenv
import os
import json
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
import uuid

# 환경 변수 로드
load_dotenv()

# FastAPI 앱 초기화
app = FastAPI(title="AI 전산 공지 생성기")

# 정적 파일 및 템플릿 설정
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Gemini API 설정
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY가 .env 파일에 설정되지 않았습니다.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash-lite')

# 데이터 저장소 (실제 운영시에는 DB 사용 권장)
notices_db = []
chat_sessions = {}

# 템플릿 구조 로드
def load_template_structure():
    with open("notice_templates/template_structure.json", "r", encoding="utf-8") as f:
        return json.load(f)

template_structure = load_template_structure()


# Pydantic 모델
class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: str

class Notice(BaseModel):
    id: str
    title: str
    content: str
    created_at: str
    updated_at: str
    systems: List[str]
    date: str

class NoticeCreate(BaseModel):
    title: str
    content: str
    systems: List[str]
    date: str

class NoticeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    systems: Optional[List[str]] = None
    date: Optional[str] = None


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """메인 페이지 - 채팅 인터페이스"""
    return templates.TemplateResponse(
        "chat.html",
        {
            "request": request,
            "systems": template_structure["systems"],
            "tag_types": template_structure["tag_types"]
        }
    )


@app.get("/notices", response_class=HTMLResponse)
async def notices_page(request: Request):
    """공지 관리 페이지"""
    return templates.TemplateResponse(
        "notices.html",
        {"request": request}
    )


# ==================== 채팅 API ====================

@app.post("/api/chat")
async def chat(message: str = Form(...), session_id: str = Form(...)):
    """채팅 메시지 처리"""
    try:
        # 세션 초기화
        if session_id not in chat_sessions:
            chat_sessions[session_id] = {
                "messages": [],
                "context": create_system_prompt()
            }
        
        session = chat_sessions[session_id]
        
        # 사용자 메시지 저장
        user_message = {
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat()
        }
        session["messages"].append(user_message)
        
        # Gemini API 호출
        chat_history = build_chat_history(session["messages"])
        full_prompt = f"{session['context']}\n\n대화 기록:\n{chat_history}\n\n사용자: {message}\n\nAI:"
        
        response = model.generate_content(full_prompt)
        ai_response = response.text
        
        # AI 응답 저장
        assistant_message = {
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.now().isoformat()
        }
        session["messages"].append(assistant_message)
        
        # 공지 생성 감지
        notice_data = extract_notice_from_response(ai_response)
        
        return JSONResponse(content={
            "success": True,
            "message": ai_response,
            "notice_generated": notice_data is not None,
            "notice": notice_data
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"채팅 처리 중 오류: {str(e)}")


@app.get("/api/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """채팅 기록 조회"""
    if session_id not in chat_sessions:
        return JSONResponse(content={"messages": []})
    
    return JSONResponse(content={"messages": chat_sessions[session_id]["messages"]})


@app.delete("/api/chat/session/{session_id}")
async def clear_chat(session_id: str):
    """채팅 세션 초기화"""
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    return JSONResponse(content={"success": True, "message": "채팅이 초기화되었습니다."})


# ==================== 공지 CRUD API ====================

@app.get("/api/notices")
async def get_notices():
    """모든 공지 조회"""
    return JSONResponse(content={"notices": notices_db})


@app.get("/api/notices/{notice_id}")
async def get_notice(notice_id: str):
    """특정 공지 조회"""
    notice = next((n for n in notices_db if n["id"] == notice_id), None)
    if not notice:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없습니다.")
    return JSONResponse(content=notice)


@app.post("/api/notices")
async def create_notice(
    title: str = Form(...),
    content: str = Form(...),
    systems: str = Form(...),
    date: str = Form(...)
):
    """새 공지 생성"""
    notice_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    notice = {
        "id": notice_id,
        "title": title,
        "content": content,
        "systems": systems.split(",") if isinstance(systems, str) else systems,
        "date": date,
        "created_at": now,
        "updated_at": now
    }
    
    notices_db.append(notice)
    
    return JSONResponse(content={
        "success": True,
        "message": "공지가 생성되었습니다.",
        "notice": notice
    })


@app.put("/api/notices/{notice_id}")
async def update_notice(
    notice_id: str,
    title: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    systems: Optional[str] = Form(None),
    date: Optional[str] = Form(None)
):
    """공지 수정"""
    notice = next((n for n in notices_db if n["id"] == notice_id), None)
    if not notice:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없습니다.")
    
    if title:
        notice["title"] = title
    if content:
        notice["content"] = content
    if systems:
        notice["systems"] = systems.split(",") if isinstance(systems, str) else systems
    if date:
        notice["date"] = date
    
    notice["updated_at"] = datetime.now().isoformat()
    
    return JSONResponse(content={
        "success": True,
        "message": "공지가 수정되었습니다.",
        "notice": notice
    })


@app.delete("/api/notices/{notice_id}")
async def delete_notice(notice_id: str):
    """공지 삭제"""
    global notices_db
    notice = next((n for n in notices_db if n["id"] == notice_id), None)
    if not notice:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없습니다.")
    
    notices_db = [n for n in notices_db if n["id"] != notice_id]
    
    return JSONResponse(content={
        "success": True,
        "message": "공지가 삭제되었습니다."
    })


# ==================== 헬퍼 함수 ====================

def create_system_prompt() -> str:
    """시스템 프롬프트 생성 - 개발자 형식 데이터를 공지 형식으로 변환"""
    return """
당신은 전산팀의 공지문 작성 전문 AI 어시스턴트입니다.

## 핵심 역할
**개발자가 작성한 날것의 업무 데이터를 받아서, 정리된 공지 형식으로 변환합니다.**

사용자는 불렛 포인트로 나열된 개발 진행 사항이나 구조화되지 않은 텍스트를 제공할 것입니다.
당신의 임무는 이 데이터를 읽고 **표준 공지 형식**으로 깔끔하게 정리하는 것입니다.

## 대화 흐름

### 1단계: 기본 정보 수집
먼저 다음 정보만 물어봅니다:
- 공지 날짜 (예: 2025.11.24)
- 적용 시스템 (예: Smart DERP/POS, 넷오피스, E-Commerce, OneTeam)
- 각 섹션별 건수 (업데이트 완료, 신규 업데이트, 일부반영 or 구조 변경, 업데이트 예정)

### 2단계: 업무 데이터 요청
"업데이트 내용을 알려주세요. 개발 진행 사항이나 업무 내역을 그대로 복사해서 붙여넣어 주시면 됩니다!"

### 3단계: 데이터 파싱 및 변환
사용자가 제공한 날것의 데이터에서:
1. **기능명** 추출
2. **날짜** 추출 (다양한 형식 인식: ~09/05, 250904 등)
3. **배경/목적** 추출
4. **대상** 추출 (명시되지 않으면 "전사" 또는 "해당 팀")
5. **변경 내용** 정리
6. **경로** 추출

그리고 **표준 공지 형식**으로 변환합니다.

**중요:** 사용자가 데이터를 한 번에 붙여넣으면, 하나하나 물어보지 말고 바로 파싱해서 공지를 생성합니다!

## 공지 표준 형식 (들여쓰기 포함)

제목: 정기 전산 업데이트(YYYY.MM.DD)

■ 요약
적용시스템: [시스템1, 시스템2, ...]
업데이트 현확 요약
업데이트 완료: X건
신규 업데이트: X건
일부반영 or 구조 변경: X건
업데이트 예정: X건

■ 업데이트 완료
• [시스템명]
    ○ [기능명](날짜)
        ▪ 배경
            • [배경 설명]
        ▪ 대상
            • [대상 설명]
        ▪ 변경
            • [변경 내용 1]
            • [변경 내용 2]
        ▪ 경로
            • [메뉴 경로]
    
    ○ [간단한 수정](날짜)

■ 신규 업데이트
• [시스템명]
    ○ [기능명](날짜)
        ▪ 배경
            • [배경 설명]
        ▪ 대상
            • [대상 설명]
        ▪ 변경
            • [변경 내용]
        ▪ 경로
            • [메뉴 경로]

■ 일부반영 or 구조 변경
• [시스템명]
    ○ [기능명](날짜)
        ▪ 변경 전 경로(As-Is)
            • [기존 경로]
        ▪ 변경 후 경로(To-Be)
            • [새 경로]
        ▪ 변경 사항
            • [변경 설명]

■ 업데이트 예정
• [시스템명]
    ○ [기능명](예정일)
        • [간단한 설명]

업데이트 관련 궁금하신 점이 있을 경우 전산팀을 통해 문의해 주시기 바랍니다.

감사합니다.

## 데이터 파싱 규칙

### 날짜 인식
- "~09/05", "09/23", "250904" → 2025.09.05, 2025.09.23, 2025.09.04로 변환
- "__by박준형차장__" 같은 담당자 정보는 제거

### 배경/목적 인식
- "배경:", "목적:", "이유:" 등의 키워드가 있는 내용
- 여러 줄에 걸쳐 있어도 하나로 합쳐서 정리

### 변경 내용 인식
- "*"로 시작하는 불렛 포인트들
- 세부 항목들을 "•"로 정리

### 경로 인식
- "경로:", "메뉴:", "위치:" 등의 키워드
- "D-ERP >", "넷오피스 >" 같은 패턴

### 간단한 항목 처리
배경/대상/변경/경로가 명시되지 않고 짧은 설명만 있다면:
    ○ [기능명](날짜)
이 형식으로 한 줄 처리

## 들여쓰기 규칙
- **■ 섹션**: 왼쪽 정렬
- **• 시스템명**: 들여쓰기 없음
- **○ 기능명**: 공백 4칸
- **▪ 레이블**: 공백 8칸
- **• 내용**: 공백 12칸

## 공지 생성 시 마커 사용

### 생성된 공지 ###
[위 형식대로 공지 작성]
### 생성 완료 ###

이 마커를 사용하면 시스템이 자동으로 공지를 저장합니다.

## 사용 가능한 시스템
- Smart DERP/POS
- 넷오피스
- E-Commerce
- OneTeam

## 중요 사항
1. 사용자가 제공한 원본 데이터를 최대한 활용하되, 깔끔하게 정리
2. 불필요한 정보(담당자 태그, 취소선, __내용__ 등)는 제거
3. 날짜 형식은 통일 (YYYY.MM.DD)
4. 데이터가 불명확하거나 부족하면 그때만 추가 질문
"""

def build_chat_history(messages: List[dict]) -> str:
    """채팅 기록을 문자열로 변환"""
    history = []
    for msg in messages[-10:]:  # 최근 10개 메시지만
        role = "사용자" if msg["role"] == "user" else "AI"
        history.append(f"{role}: {msg['content']}")
    return "\n".join(history)


def extract_notice_from_response(response: str) -> Optional[dict]:
    """AI 응답에서 공지 추출"""
    if "### 생성된 공지 ###" not in response or "### 생성 완료 ###" not in response:
        return None
    
    try:
        # 공지 내용 추출
        start = response.find("### 생성된 공지 ###") + len("### 생성된 공지 ###")
        end = response.find("### 생성 완료 ###")
        notice_content = response[start:end].strip()
        
        # 제목 추출
        title_line = notice_content.split("\n")[0]
        title = title_line.replace("제목:", "").strip()
        
        # 본문 추출
        content_lines = notice_content.split("\n")[1:]
        content = "\n".join(content_lines).strip()
        
        # 기본값으로 공지 생성
        notice_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        notice = {
            "id": notice_id,
            "title": title,
            "content": content,
            "systems": ["Smart DERP/POS", "넷오피스", "E-Commerce, OneTeam"],  # 기본값
            "date": datetime.now().strftime("%Y-%m-%d"),
            "created_at": now,
            "updated_at": now
        }
        
        # DB에 저장
        notices_db.append(notice)
        
        return notice
        
    except Exception as e:
        print(f"공지 추출 오류: {e}")
        return None


@app.get("/api/template-structure")
async def get_template_structure():
    """템플릿 구조 정보 API"""
    return JSONResponse(content=template_structure)


if __name__ == "__main__":
    import uvicorn
    
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    
    print(f"\n{'='*60}")
    print(f"🚀 AI 전산 공지 생성기 시작 (채팅 모드)")
    print(f"{'='*60}")
    print(f"📍 채팅 페이지: http://{host}:{port}")
    print(f"📝 공지 관리: http://{host}:{port}/notices")
    print(f"{'='*60}\n")
    
    uvicorn.run(app, host=host, port=port)