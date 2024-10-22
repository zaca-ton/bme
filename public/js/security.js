// 비밀번호 입력 모달을 열고 커서를 비밀번호 입력 필드로 이동하는 함수
function openPasswordModal() {
    const modal = document.getElementById('passwordModal');
    modal.style.display = 'block';

    // 비밀번호 입력 필드에 포커스를 맞춤
    const passwordInput = document.getElementById('passwordInput');
    passwordInput.focus();

    // 엔터키를 눌렀을 때 비밀번호 확인 버튼을 클릭
    passwordInput.onkeydown = function(event) {
        if (event.key === 'Enter') {
            document.getElementById('confirmButton').click();
        }
    };
}

// 비밀번호 모달 닫기
function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('passwordInput').value = ''; // 입력 필드 초기화
}

document.addEventListener('DOMContentLoaded', () => {
    // 비밀번호 확인 버튼 클릭 시
    document.getElementById('confirmButton').onclick = () => {
        const enteredPassword = document.getElementById('passwordInput').value;

        // 비밀번호 서버 검증 요청
        fetch('/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: enteredPassword, postId: currentPostId }) // postId는 선택사항
        }).then(response => response.json())
          .then(data => {
              if (data.isValid) {
                  closePasswordModal(); // 모달 닫기

                  if (actionType === 'edit') {
                      enableEdit(currentPostId, window.currentRow);
                  } else if (actionType === 'delete') {
                      deletePost(currentPostId);
                  } else if (actionType === 'create') {
                      createPost();
                  }
              } else {
                  alert('비밀번호가 일치하지 않습니다.');
              }
          }).catch(error => {
              console.error('Error during password verification:', error);
          });
    };
});
