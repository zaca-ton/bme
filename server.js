require('dotenv').config();

const express = require('express');
const multer = require('multer');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // CORS 모듈 가져오기

const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

// 환경 변수 사용
const repoUrl = process.env.REPO_URL;

// Middleware
app.use(cors()); // 모든 도메인에서 요청을 허용
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // 정적 파일 제공
app.use('/uploads', express.static('uploads')); // 업로드된 파일 제공

// 프록시 미들웨어 설정
app.use('/public', createProxyMiddleware({
  target: `${repoUrl}`, // REPO_URL로 요청 전달
  changeOrigin: true,
  pathRewrite: {
    '^/public': '/public', // 경로 재작성
  }
}));

app.use('/uploads', createProxyMiddleware({
  target: `${repoUrl}`, // REPO_URL로 요청 전달
  changeOrigin: true,
  pathRewrite: {
    '^/uploads': '/uploads', // 경로 재작성
  }
}));

// posts.json 파일 요청을 REPO_URL로 프록시 설정
app.use('/data/posts.json', createProxyMiddleware({
  target: `${repoUrl}`, // REPO_URL로 요청 전달
  changeOrigin: true,
  pathRewrite: {
    '^/data/posts.json': '/data/posts.json', // 경로 재작성
  }
}));


// posts.json 파일 경로
const postsFilePath = path.join(__dirname, 'data', 'posts.json');

// Multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // 파일을 저장할 경로
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now(); // 현재 시간을 기반으로 고유한 이름 생성
        const fileExtension = path.extname(file.originalname); // 원래 파일의 확장자 추출
        cb(null, `${uniqueSuffix}${fileExtension}`); // 숫자로 된 파일명 + 확장자
    }
});
const upload = multer({ storage: storage });

// 데이터 저장용 배열
let posts = [];

let postIdCounter = 1; // 게시물 ID 카운터

// 서버 시작 시 기존 posts.json 파일에서 데이터를 불러오기
const loadPostsFromFile = (res) => {
    fs.readFile(postsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading posts.json:', err);
        } else {
            try {
                posts = JSON.parse(data); // 파일의 내용을 파싱하여 posts 배열에 저장
                if (posts.length > 0) {
                    postIdCounter = posts[posts.length - 1].id + 1; // 마지막 게시물 ID에 +1
                }
                // 클라이언트에 게시물 목록 전송
                res?.json(posts);
            } catch (parseError) {
                console.error('Error parsing JSON data:', parseError);
            }
        }
    });
};

// 게시물 저장 기능
const savePostsToFile = () => {
    fs.writeFile(postsFilePath, JSON.stringify(posts, null, 2), (err) => {
        if (err) {
            console.error('Error saving posts to posts.json:', err);
        }
    });
};

// 게시물 등록 (첨부파일이 없어도 등록 가능)
app.post('/create-post', upload.single('pdfFile'), (req, res) => {
    const { equipmentName, manufacturer, modelName, content } = req.body;
    const fileType = req.file ? path.extname(req.file.filename).slice(1).toUpperCase() + ' 파일' : null; // 파일 유형 생성
    const post = {
        id: postIdCounter++, // 현재 카운터를 사용하여 ID 생성
        equipmentName,
        manufacturer,
        modelName,
        content,
        pdfFilePath: req.file ? `/uploads/${req.file.filename}` : null, // 파일이 있으면 경로 저장, 없으면 null
        fileType // 파일 유형 추가
    };
    posts.push(post);
    savePostsToFile(); // 새 게시물 등록 시 파일 저장
    res.sendStatus(200);
});

// 게시물 목록 조회
app.get('/posts', (req, res) => {
    const page = parseInt(req.query.page) || 1; // 현재 페이지 번호
    const limit = 10; // 페이지당 게시물 수
    const startIndex = (page - 1) * limit; // 시작 인덱스
    const endIndex = startIndex + limit; // 끝 인덱스

    // ID가 큰 순서로 정렬하여 가장 최근의 게시물이 위에 오도록
    const resultPosts = posts.slice().sort((a, b) => b.id - a.id).slice(startIndex, endIndex);

    res.json({
        posts: resultPosts,
        totalCount: posts.length,
        message: resultPosts.length === 0 ? '게시글이 없습니다.' : null // 게시글이 없을 경우 메시지 추가
    });
});

// 게시물 수정
app.put('/update-post/:id', (req, res) => {
    const postId = parseInt(req.params.id);
    const { equipmentName, manufacturer, modelName, content } = req.body;

    const postIndex = posts.findIndex(post => post.id === postId);

    if (postIndex !== -1) {
        // 수정할 게시물 찾음
        const updatedPost = {
            ...posts[postIndex],
            equipmentName,
            manufacturer,
            modelName,
            content
        };

        posts[postIndex] = updatedPost; // 배열에서 게시물 수정
        savePostsToFile(); // 수정된 게시물 저장
        res.sendStatus(200); // 성공 응답
    } else {
        res.status(404).send('Post not found'); // 게시물 찾을 수 없음
    }
});

// 게시물 삭제 (첨부파일이 없어도 게시물 삭제 가능)
app.delete('/delete-post/:id', (req, res) => {
    const postId = parseInt(req.params.id);
    const postToDelete = posts.find(post => post.id === postId);

    if (postToDelete) {
        // PDF 파일이 있으면 삭제
        if (postToDelete.pdfFilePath) {
            const pdfFilePath = path.join(__dirname, postToDelete.pdfFilePath);
            fs.unlink(pdfFilePath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.error('Error deleting PDF file:', err);
                }
            });
        }

        // 게시물 삭제
        posts = posts.filter(post => post.id !== postId);
        savePostsToFile(); // 삭제 후 파일 저장
        res.sendStatus(200);
    } else {
        res.status(404).send('Post not found');
    }
});

// 검색 기능
app.get('/search-posts', (req, res) => {
    const { term, field } = req.query; // 검색어와 필드 가져오기
    const page = parseInt(req.query.page) || 1; // 현재 페이지 번호
    const limit = 10; // 페이지당 게시물 수
    const startIndex = (page - 1) * limit; // 시작 인덱스
    const endIndex = startIndex + limit; // 끝 인덱스

    // 검색어 소문자 변환
    const lowerTerm = term.toLowerCase();

    // 게시물 필터링 시 모든 비교 값 소문자 변환
    const filteredPosts = posts.filter(post => {

        // 선택된 필드에 따라 검색 수행
        if (field === 'equipmentName') {
            return post.equipmentName.toLowerCase().includes(lowerTerm);
        } else if (field === 'manufacturer') {
            return post.manufacturer.toLowerCase().includes(lowerTerm);
        } else if (field === 'modelName') {
            return post.modelName.toLowerCase().includes(lowerTerm);
        } else if (field === 'content') {
            return post.content.toLowerCase().includes(lowerTerm);
        } else if (field === 'all') {
            // 모든 필드에 대해 검색
            return (
                post.equipmentName.toLowerCase().includes(lowerTerm) ||
                post.manufacturer.toLowerCase().includes(lowerTerm) ||
                post.modelName.toLowerCase().includes(lowerTerm) ||
                post.content.toLowerCase().includes(lowerTerm)
            );
        }
        return false; // 필드가 유효하지 않으면 검색하지 않음
    });

    // ID가 큰 순서로 정렬하여 가장 최근의 게시물이 위에 오도록
    const resultPosts = filteredPosts.slice().sort((a, b) => b.id - a.id).slice(startIndex, endIndex);

    // 응답 형식 변경: 게시물이 없을 경우 메시지 포함
    res.json({
        posts: resultPosts,
        totalCount: filteredPosts.length,
        message: resultPosts.length === 0 ? '게시글이 없습니다.' : null // 게시글이 없을 경우 메시지 추가
    });
});

// 날짜 포맷을 yyyy-mm-dd hh:mm:ss로 변환하는 함수
const formatDateTime = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`; // 포맷팅된 문자열 반환
};


//오전 9:08 2024-10-17 아래 추가 (서버 시작 전까지)

// 비밀번호 검증 API
app.post('/verify-password', (req, res) => {
    const { password } = req.body;
    
    // hashedPassword.txt 파일 경로 설정
    const hashedPasswordFilePath = path.join(__dirname, 'data', 'hashedPassword.txt');

    // 비밀번호 검증 로직
    fs.readFile(hashedPasswordFilePath, 'utf8', (err, storedHashedPassword) => {
        if (err) {
            return res.status(500).json({ message: '서버 오류: 비밀번호 파일을 읽을 수 없습니다.' });
        }

        // bcrypt를 이용해 비밀번호 비교
        bcrypt.compare(password, storedHashedPassword.trim(), (err, isValid) => {
            if (err) {
                return res.status(500).json({ message: '서버 오류: 비밀번호 비교 중 오류 발생.' });
            }

            if (isValid) {
                return res.json({ isValid: true });
            } else {
                return res.json({ isValid: false });
            }
        });
    });
});

// 서버 시작
app.listen(PORT, () => {
    const startTime = new Date(); // 시작 시간 기록
    loadPostsFromFile(); // 서버 시작 시 게시물 로드
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Server started at: ${formatDateTime(startTime)}`);
});
