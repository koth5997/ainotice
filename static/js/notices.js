let allNotices = [];
let currentNoticeId = null;

// 페이지 로드 시 공지 목록 불러오기
document.addEventListener('DOMContentLoaded', function() {
    loadNotices();
});

// 공지 목록 불러오기
async function loadNotices() {
    try {
        const response = await fetch('/api/notices');
        const data = await response.json();
        
        allNotices = data.notices || [];
        displayNotices(allNotices);
        
    } catch (error) {
        console.error('Error loading notices:', error);
        showNotification('공지 목록을 불러오는데 실패했습니다.', 'error');
    }
}

// 공지 목록 표시
function displayNotices(notices) {
    const grid = document.getElementById('noticesGrid');
    const emptyState = document.getElementById('emptyState');
    
    if (notices.length === 0) {
        grid.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    grid.innerHTML = notices.map(notice => `
        <div class="notice-card" onclick="viewNoticeDetail('${notice.id}')">
            <div class="notice-header">
                <div class="notice-title">${escapeHtml(notice.title)}</div>
                <div class="notice-date">📅 ${formatDate(notice.date)}</div>
            </div>
            <div class="notice-systems">
                ${notice.systems.map(sys => `
                    <span class="system-badge">${escapeHtml(sys)}</span>
                `).join('')}
            </div>
            <div class="notice-preview">${escapeHtml(getPreview(notice.content))}</div>
            <div class="notice-footer">
                <div class="notice-meta">
                    생성: ${formatDateTime(notice.created_at)}
                </div>
            </div>
        </div>
    `).join('');
}

// 공지 상세 보기
async function viewNoticeDetail(noticeId) {
    try {
        const response = await fetch(`/api/notices/${noticeId}`);
        const notice = await response.json();
        
        currentNoticeId = noticeId;
        
        document.getElementById('detailTitle').textContent = notice.title;
        document.getElementById('detailDate').textContent = formatDate(notice.date);
        document.getElementById('detailSystems').innerHTML = notice.systems
            .map(sys => `<span class="system-badge">${escapeHtml(sys)}</span>`)
            .join(' ');
        document.getElementById('detailContent').textContent = notice.content;
        document.getElementById('detailCreated').textContent = formatDateTime(notice.created_at);
        document.getElementById('detailUpdated').textContent = formatDateTime(notice.updated_at);
        
        document.getElementById('noticeModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading notice detail:', error);
        showNotification('공지를 불러오는데 실패했습니다.', 'error');
    }
}

// 모달 닫기
function closeModal() {
    document.getElementById('noticeModal').style.display = 'none';
    currentNoticeId = null;
}

// 공지 내용 복사
function copyNoticeContent() {
    const title = document.getElementById('detailTitle').textContent;
    const content = document.getElementById('detailContent').textContent;
    const fullContent = `${title}\n\n${content}`;
    
    navigator.clipboard.writeText(fullContent).then(() => {
        showNotification('클립보드에 복사되었습니다!', 'success');
    }).catch(err => {
        showNotification('복사 실패: ' + err.message, 'error');
    });
}

// 공지 다운로드
function downloadNoticeContent() {
    const title = document.getElementById('detailTitle').textContent;
    const content = document.getElementById('detailContent').textContent;
    const date = document.getElementById('detailDate').textContent;
    const fullContent = `${title}\n\n${content}`;
    
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.txt`;
    link.click();
    
    showNotification('파일이 다운로드되었습니다!', 'success');
}

// 공지 수정 모달 열기
function editNotice() {
    const notice = allNotices.find(n => n.id === currentNoticeId);
    if (!notice) return;
    
    document.getElementById('editNoticeId').value = notice.id;
    document.getElementById('editTitle').value = notice.title;
    document.getElementById('editDate').value = notice.date;
    document.getElementById('editContent').value = notice.content;
    
    // 시스템 선택
    const systemsSelect = document.getElementById('editSystems');
    Array.from(systemsSelect.options).forEach(option => {
        option.selected = notice.systems.includes(option.value);
    });
    
    closeModal();
    document.getElementById('editModal').style.display = 'flex';
}

// 수정 모달 닫기
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// 공지 수정 저장
async function saveNoticeEdit() {
    const noticeId = document.getElementById('editNoticeId').value;
    const title = document.getElementById('editTitle').value;
    const date = document.getElementById('editDate').value;
    const content = document.getElementById('editContent').value;
    
    const systemsSelect = document.getElementById('editSystems');
    const systems = Array.from(systemsSelect.selectedOptions).map(opt => opt.value);
    
    if (!title || !date || !content || systems.length === 0) {
        showNotification('모든 필드를 입력해주세요.', 'warning');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('date', date);
        formData.append('content', content);
        formData.append('systems', systems.join(','));
        
        const response = await fetch(`/api/notices/${noticeId}`, {
            method: 'PUT',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('공지가 수정되었습니다!', 'success');
            closeEditModal();
            loadNotices();
        } else {
            throw new Error(data.message || '수정 실패');
        }
        
    } catch (error) {
        console.error('Error updating notice:', error);
        showNotification('수정 실패: ' + error.message, 'error');
    }
}

// 공지 삭제 확인
function deleteNoticeConfirm() {
    if (!confirm('정말로 이 공지를 삭제하시겠습니까?')) {
        return;
    }
    
    deleteNotice(currentNoticeId);
}

// 공지 삭제
async function deleteNotice(noticeId) {
    try {
        const response = await fetch(`/api/notices/${noticeId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('공지가 삭제되었습니다.', 'success');
            closeModal();
            loadNotices();
        } else {
            throw new Error(data.message || '삭제 실패');
        }
        
    } catch (error) {
        console.error('Error deleting notice:', error);
        showNotification('삭제 실패: ' + error.message, 'error');
    }
}

// 공지 필터링
function filterNotices() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const systemFilter = document.getElementById('systemFilter').value;
    
    const filtered = allNotices.filter(notice => {
        const matchesSearch = notice.title.toLowerCase().includes(searchTerm) ||
                            notice.content.toLowerCase().includes(searchTerm);
        const matchesSystem = !systemFilter || notice.systems.includes(systemFilter);
        
        return matchesSearch && matchesSystem;
    });
    
    displayNotices(filtered);
}

// 헬퍼 함수들
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getPreview(content, maxLength = 150) {
    if (content.length <= maxLength) {
        return content;
    }
    return content.substring(0, maxLength) + '...';
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

// 모달 외부 클릭 시 닫기
window.onclick = function(event) {
    const noticeModal = document.getElementById('noticeModal');
    const editModal = document.getElementById('editModal');
    
    if (event.target === noticeModal) {
        closeModal();
    }
    if (event.target === editModal) {
        closeEditModal();
    }
}
