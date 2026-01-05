# OniCare Admin Backend (FastAPI)

FastAPI 기반 어드민 백엔드 서버

## 기술 스택

| 항목 | 기술 | 버전 |
|------|------|------|
| Language | Python | 3.10+ |
| Framework | FastAPI | Latest |
| DB Driver | psycopg3 | 3.1+ |
| Database | PostgreSQL | 16+ |
| Token Store | Redis | 7+ |
| ASGI Server | Uvicorn | Latest |

## 프로젝트 구조

```
backend/
├── app/
│   ├── config/           # 설정 (DB, Redis, Settings)
│   ├── core/             # 핵심 기능 (Logger, Exceptions, Decorators)
│   ├── middleware/       # 미들웨어 (Auth)
│   ├── models/           # Pydantic 모델
│   ├── routers/          # API 라우터
│   ├── services/         # 비즈니스 로직
│   ├── utils/            # 유틸리티
│   └── main.py           # 앱 진입점
├── sql/                  # SQL 쿼리 파일
├── db/                   # 스키마 파일
├── logs/                 # 로그 파일
└── requirements.txt
```

## 설치 및 실행

### 1. 가상환경 생성

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. 의존성 설치

```bash
pip install -r requirements.txt
```

### 3. 환경변수 설정

`.env` 파일을 생성하고 필요한 환경변수를 설정합니다:

```bash
cp .env.example .env
```

### 4. 서버 실행

```bash
# 개발 모드
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# 프로덕션 모드
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
```

## API 문서

- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## 환경변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| APP_NAME | 앱 이름 | OniCare Admin Backend |
| APP_ENV | 실행 환경 | development |
| DEBUG | 디버그 모드 | true |
| HOST | 서버 호스트 | 0.0.0.0 |
| PORT | 서버 포트 | 8001 |
| DB_HOST | Admin DB 호스트 | localhost |
| DB_PORT | Admin DB 포트 | 5432 |
| DB_NAME | Admin DB 이름 | oni_care_admin |
| DB_USER | Admin DB 사용자 | postgres |
| DB_PASSWORD | Admin DB 비밀번호 | |
| APP_DB_HOST | App DB 호스트 | localhost |
| APP_DB_PORT | App DB 포트 | 5432 |
| APP_DB_NAME | App DB 이름 | oni_care |
| APP_DB_USER | App DB 사용자 | postgres |
| APP_DB_PASSWORD | App DB 비밀번호 | |
| REDIS_HOST | Redis 호스트 | localhost |
| REDIS_PORT | Redis 포트 | 6379 |
| REDIS_DB | Redis DB 번호 | 0 |
| TOKEN_SECRET_KEY | JWT 시크릿 키 | |
| ACCESS_TOKEN_EXPIRE_MINUTES | Access Token 만료 시간 (분) | 60 |
| REFRESH_TOKEN_EXPIRE_DAYS | Refresh Token 만료 시간 (일) | 7 |
| CORS_ORIGINS | CORS 허용 도메인 | http://localhost:3000 |

## API 엔드포인트

### 인증 (Auth)
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/logout` - 로그아웃
- `POST /api/v1/auth/refresh` - 토큰 갱신
- `GET /api/v1/auth/verify` - 토큰 검증

### 관리자 (Admin Users)
- `GET /api/v1/admin/admin-users` - 목록 조회
- `POST /api/v1/admin/admin-users` - 등록
- `GET /api/v1/admin/admin-users/{id}` - 상세 조회
- `PUT /api/v1/admin/admin-users/{id}` - 수정
- `DELETE /api/v1/admin/admin-users/{id}` - 삭제

### 컨텐츠 (Contents)
- `GET /api/v1/admin/contents` - 목록 조회
- `POST /api/v1/admin/contents` - 등록
- `GET /api/v1/admin/contents/{id}` - 상세 조회
- `PUT /api/v1/admin/contents/{id}` - 수정
- `DELETE /api/v1/admin/contents/{id}` - 삭제

### 기타 API
- 역할 (Roles)
- 메뉴 (Menus)
- 회사 (Companies)
- 부서 (Departments)
- 보안 그룹 (Security Groups)
- 공통 코드 (Common Codes)
- 시스템 설정 (System Settings)
- 로그 (Logs)
- 공지사항 (Notices)
- 회원 (Members)
- 대시보드 (Dashboard)

## 트랜잭션 관리

### @auto_commit
독립적인 작업에 사용 (로그 기록 등)

### @transactional
원자적 작업에 사용 (주문 처리 등)

