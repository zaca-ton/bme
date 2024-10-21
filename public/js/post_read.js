const serverUrl = process.env.SERVER_URL; // 서버 URL을 환경 변수에서 불러옴
fetch(`${serverUrl}/posts?page=${currentPage}`)
    .then(response => response.json())
    .then(data => {
        // 데이터 처리
    })
    .catch(error => {
        console.error('Error:', error);
    });

function renderPosts(posts, totalCount = 0, isSearch = false) {
    const postsTableBody = document.querySelector('#postsTableBody');
    postsTableBody.innerHTML = ''; // 기존 게시물 초기화

    if (posts.length === 0) {
        const noPostsRow = postsTableBody.insertRow();
        noPostsRow.innerHTML = `<td colspan="8">${isSearch ? '검색 결과가 없습니다.' : '게시물이 없습니다.'}</td>`; // 게시물 없음 메시지
    } else {
        posts.forEach((post, index) => {
            const row = postsTableBody.insertRow();
            row.insertCell(0).textContent = isSearch ? index + 1 : (currentPage - 1) * 10 + index + 1; // 번호
            row.insertCell(1).textContent = post.equipmentName; // 장비명
            row.insertCell(2).textContent = post.manufacturer; // 제조사
            row.insertCell(3).textContent = post.modelName; // 모델명
            row.insertCell(4).textContent = post.content; // 내용
            
            // 첨부파일 열에서 파일 확장자 표시
            const fileType = post.pdfFilePath ? post.pdfFilePath.split('.').pop().toUpperCase() : '';
            row.insertCell(5).innerHTML = post.pdfFilePath ? `<a href="${post.pdfFilePath}" target="_blank">${fileType} 파일</a>` : ''; // 첨부파일
            
            const editCell = row.insertCell(6);
            const editButton = document.createElement('button');
            editButton.textContent = '수정';
            editButton.onclick = () => onEditButtonClick(post.id, row); // 수정 버튼에 post.id 추가
            editCell.appendChild(editButton);

            const deleteCell = row.insertCell(7);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '삭제';
            deleteButton.onclick = () => onDeleteButtonClick(post.id); // 삭제 버튼에 post.id 추가
            deleteCell.appendChild(deleteButton);
        });

        document.getElementById('postCount').textContent = `총 게시물 수: ${totalCount}`; // 게시물 수 업데이트
        updatePagination(totalCount);
    }
}

function loadPosts() {
    fetch(`/posts?page=${currentPage}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            renderPosts(data.posts, data.totalCount); // 일반 게시물 렌더링
        })
        .catch(error => {
            console.error('Error loading posts:', error); // 오류 로그
        });
}

function searchPosts() {
    const searchTerm = document.getElementById('searchTerm').value.toLowerCase(); // 소문자 변환
    const searchField = document.getElementById('searchField').value; // 선택한 검색 조건

    let url = `/search-posts?term=${encodeURIComponent(searchTerm)}&field=${searchField}&page=${currentPage}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            renderPosts(data.posts, data.totalCount, true); // 검색 결과 렌더링
        });
}
