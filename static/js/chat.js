// 세션 ID 생성
const sessionId = generateSessionId();
let currentNotice = null;

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 페이지 로드 시
document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('messageInput');

    // 텍스트 영역 자동 높이 조절
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    // Enter 키로 전송 (Shift+Enter는 줄바꿈)
    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('chatForm').dispatchEvent(new Event('submit'));
        }
    });
});

// 채팅 폼 제출
document.getElementById('chatForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();

    if (!message) return;

    // 사용자 메시지 표시
    addMessage('user', message);

    // 입력 필드 초기화
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // 전송 버튼 비활성화
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.querySelector('span').textContent = '전송 중...';

    try {
        // API 호출
        const formData = new FormData();
        formData.append('message', message);
        formData.append('session_id', sessionId);

        const response = await fetch('/api/chat', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // AI 응답 표시
            addMessage('assistant', data.message);

            // 공지가 생성되었으면 미리보기 표시
            if (data.notice_generated && data.notice) {
                currentNotice = data.notice;
                showPreview(data.notice);
                showNotification('✅ 공지가 생성되어 저장되었습니다!', 'success');
            }
        } else {
            throw new Error(data.detail || '메시지 전송 실패');
        }

    } catch (error) {
        console.error('Error:', error);
        addMessage('assistant', '죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.');
        showNotification('오류: ' + error.message, 'error');
    } finally {
        // 전송 버튼 활성화
        sendBtn.disabled = false;
        sendBtn.querySelector('span').textContent = '보내기';
        messageInput.focus();
    }
});

// 메시지 추가 - 스크롤 자동 이동 강화
function addMessage(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = role === 'user' ? '👤' : '🤖';
    const time = new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(content)}</div>
            <div class="message-time">${time}</div>
        </div>
    `;

    chatMessages.appendChild(messageDiv);

    // 여러 단계로 스크롤 보장
    scrollToBottom();
}

// 스크롤을 맨 아래로 이동 (여러 방법 동시 적용)
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');

    // 방법 1: 즉시 스크롤
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 방법 2: requestAnimationFrame 사용
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    // 방법 3: 짧은 딜레이 후 스크롤 (렌더링 대기)
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);

    // 방법 4: 좀 더 긴 딜레이 (긴 메시지 대응)
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 150);

    // 방법 5: 부드러운 스크롤 (최종)
    setTimeout(() => {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }, 200);
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// 미리보기 표시
function showPreview(notice) {
    const previewPanel = document.getElementById('previewPanel');
    const previewContent = document.getElementById('previewContent');

    previewContent.textContent = `${notice.title}\n\n${notice.content}`;
    previewPanel.style.display = 'flex';
}

// 미리보기 닫기
function closePreview() {
    document.getElementById('previewPanel').style.display = 'none';
}

// 공지 목록 보기
function viewAllNotices() {
    window.location.href = '/notices';
}

// 공지 복사
function copyNotice() {
    const content = document.getElementById('previewContent').textContent;

    navigator.clipboard.writeText(content).then(() => {
        showNotification('클립보드에 복사되었습니다!', 'success');
    }).catch(err => {
        showNotification('복사 실패: ' + err.message, 'error');
    });
}

// 채팅 초기화
async function clearChat() {
    if (!confirm('대화 내용을 모두 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/chat/session/${sessionId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            // 채팅 메시지 초기화
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = `
                <div class="message assistant">
                    <div class="message-avatar">🤖</div>
                    <div class="message-content">
                        <div class="message-text">
                            안녕하세요! 전산 공지문 작성을 도와드리는 AI 어시스턴트입니다.<br><br>
                            어떤 공지를 작성하시겠어요? 다음 정보를 알려주세요:<br>
                            - 공지 날짜<br>
                            - 적용 시스템<br>
                            - 업데이트 내용<br><br>
                            편하게 대화하듯이 말씀해주시면 됩니다! 😊
                        </div>
                        <div class="message-time">방금 전</div>
                    </div>
                </div>
            `;

            closePreview();
            showNotification('대화가 초기화되었습니다.', 'info');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('초기화 실패: ' + error.message, 'error');
    }
}

// 알림 표시
function showNotification(message, type = 'info') {
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };

    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        backgroundColor: colors[type] || colors.info,
        color: 'white',
        fontWeight: '600',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        zIndex: '2000',
        animation: 'slideInRight 0.3s ease',
        maxWidth: '400px'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 애니메이션 스타일 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);