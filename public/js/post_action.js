function createPost() {
    const equipmentName = document.getElementById('equipmentName').value;
    const manufacturer = document.getElementById('manufacturer').value;
    const modelName = document.getElementById('modelName').value;
    const content = document.getElementById('content').value;
    const pdfFile = document.getElementById('pdfFile').files[0];

    const formData = new FormData();
    formData.append('equipmentName', equipmentName);
    formData.append('manufacturer', manufacturer);
    formData.append('modelName', modelName);
    formData.append('content', content);
    formData.append('pdfFile', pdfFile);

    fetch('/create-post', {
        method: 'POST',
        body: formData,
    }).then(response => {
        if (response.ok) {
            loadPosts(); // 게시물 새로 고침
            closePostForm(); // 폼 닫기
        }
    });
}

function deletePost(postId) {
    const confirmed = confirm('정말로 삭제하시겠습니까?');
    if (confirmed) {
        fetch(`/delete-post/${postId}`, {
            method: 'DELETE',
        }).then(response => {
            if (response.ok) {
                loadPosts(); // 게시물 새로 고침
            }
        });
    }
}

function enableEdit(postId, row) {
    // 특정 포스트에 대한 편집 기능 구현
    const cells = row.cells;
    for (let i = 1; i <= 4; i++) { // 1부터 4까지의 셀 (장비명, 제조사, 모델명, 내용)
        const input = document.createElement('input');
        input.value = cells[i].textContent;
        cells[i].innerHTML = ''; // 셀 초기화
        cells[i].appendChild(input);
    }

    // 수정 버튼을 저장 버튼으로 변경
    const editButton = cells[6].querySelector('button');
    editButton.textContent = '저장';
    editButton.onclick = () => {
        const updatedPost = {
            id: postId,
            equipmentName: cells[1].querySelector('input').value,
            manufacturer: cells[2].querySelector('input').value,
            modelName: cells[3].querySelector('input').value,
            content: cells[4].querySelector('input').value
        };

        fetch(`/update-post/${postId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPost),
        }).then(response => {
            if (response.ok) {
                loadPosts(); // 게시물 새로 고침
            }
        });
    };
}

// 수정 버튼 클릭 시
function onEditButtonClick(postId, row) {
    actionType = 'edit'; // 수정 액션
    currentPostId = postId;
    openPasswordModal();
    // row를 전역변수로 설정합니다.
    window.currentRow = row; // 새로운 줄을 추가
}

// 삭제 버튼 클릭 시
function onDeleteButtonClick(postId) {
    actionType = 'delete'; // 삭제 액션
    currentPostId = postId;
    openPasswordModal();
}

// 매뉴얼 등록 메뉴
function openPostForm() {
    document.getElementById('postForm').style.display = 'block';
}

function closePostForm() {
    document.getElementById('postForm').style.display = 'none';
    document.getElementById('equipmentName').value = '';
    document.getElementById('manufacturer').value = '';
    document.getElementById('modelName').value = '';
    document.getElementById('content').value = '';
    document.getElementById('pdfFile').value = '';
}
