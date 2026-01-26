# test_api.py
import google.generativeai as genai

genai.configure(api_key="AIzaSyBvKfXlDJOHtyynbZV1hjMbRYFuJ_zDiuo")
model = genai.GenerativeModel('gemini-2.5-flash-lite')

try:
    response = model.generate_content("안녕하세요! 간단한 전산 공지를 만들어주세요.")
    print("✅ API 연결 성공!")
    print(f"응답:\n{response.text}")
except Exception as e:
    print(f"❌ 오류: {e}")