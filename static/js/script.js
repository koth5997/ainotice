// 현재 날짜를 기본값으로 설정
document.addEventListener('DOMContentLoaded', function () {
    const dateInput = document.getElementById('date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
});

// 폼 제출 처리
document.getElementById('noticeForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const generateBtn = document.getElementById('generateBtn');
    const loading = document.getElementById('loading');
    const resultSection = document.getElementById('resultSection');

    // 버튼 비활성화 및 로딩 표시
    generateBtn.disabled = true;
    generateBtn.textContent = '생성 중...';
    loading.style.display = 'block';
    resultSection.style.display = 'none';

    try {
        // 폼 데이터 수집
        const formData = new FormData(this);

        // 선택된 시스템들을 쉼표로 구분된 문자열로 변환
        const systemsSelect = document.getElementById('systems');
        const selectedSystems = Array.from(systemsSelect.selectedOptions)
            .map(option => option.value)
            .join(', ');
        formData.set('systems', selectedSystems);

        // API 호출
        const response = await fetch('/generate-notice', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // 결과 표시
            document.getElementById('resultContent').textContent = data.notice;
            resultSection.style.display = 'block';

            // 결과 섹션으로 스크롤
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            showNotification('공지가 성공적으로 생성되었습니다!', 'success');
        } else {
            throw new Error(data.message || '공지 생성에 실패했습니다.');
        }

    } catch (error) {
        console.error('Error:', error);
        showNotification('오류: ' + error.message, 'error');
    } finally {
        // 버튼 활성화 및 로딩 숨김
        generateBtn.disabled = false;
        generateBtn.textContent = '🚀 공지 생성하기';
        loading.style.display = 'none';
    }
});

// 클립보드에 복사
function copyToClipboard() {
    const content = document.getElementById('resultContent').textContent;

    navigator.clipboard.writeText(content).then(() => {
        showNotification('클립보드에 복사되었습니다!', 'success');
    }).catch(err => {
        showNotification('복사 실패: ' + err.message, 'error');
    });
}

// 다운로드
function downloadNotice() {
    const content = document.getElementById('resultContent').textContent;
    const dateInput = document.getElementById('date').value;
    const filename = `전산공지_${dateInput.replace(/-/g, '')}.txt`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();

    showNotification('파일이 다운로드되었습니다!', 'success');
}

// 폼 초기화
function resetForm() {
    if (confirm('입력한 내용을 모두 초기화하시겠습니까?')) {
        document.getElementById('noticeForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
        document.getElementById('resultSection').style.display = 'none';
        showNotification('폼이 초기화되었습니다.', 'info');
    }
}

// 알림 표시
function showNotification(message, type = 'info') {
    // 기존 알림 제거
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }

    // 새 알림 생성
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // 스타일 적용
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        backgroundColor: type === 'success' ? '#10b981' :
            type === 'error' ? '#ef4444' : '#3b82f6',
        color: 'white',
        fontWeight: '600',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        zIndex: '1000',
        animation: 'slideInRight 0.3s ease',
        maxWidth: '400px'
    });

    document.body.appendChild(notification);

    // 3초 후 자동 제거
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// 애니메이션 키프레임 추가
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

// 텍스트 영역 자동 높이 조절
document.getElementById('update_details').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});

document.getElementById('additional_info').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
});
