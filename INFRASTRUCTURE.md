# ONI Care 인프라 세팅 문서

> 작성일: 2026-01-02  
> 프로젝트: ONI Care (App + Admin)

---

## 📋 목차

1. [프로젝트 구조](#프로젝트-구조)
2. [인프라 스택](#인프라-스택)
3. [데이터베이스](#데이터베이스)
4. [개발 환경](#개발-환경)
5. [파일 시스템](#파일-시스템)
6. [환경 변수](#환경-변수)
7. [실행 방법](#실행-방법)

---

## 프로젝트 구조

```
/Users/gfhs1/dev/
├── oni_care/              # 사용자 앱 (Next.js)
│   ├── src/
│   ├── public/
│   │   ├── images/        # 기존 컨텐츠 이미지 (원본)
│   │   └── uploads/       # → oni_care_admin/public/uploads (심볼릭 링크)
│   └── backend/db/
│       └── schema.sql     # 앱 DB 스키마
│
└── oni_care_admin/        # 관리자 어드민 (Next.js)
    ├── src/
    ├── public/
    │   ├── images/        # → oni_care/public/images (심볼릭 링크)
    │   └── uploads/       # 새로 업로드된 이미지 (원본)
    └── schema.sql         # 어드민 DB 스키마
```

---

## 인프라 스택

### 1. 컨테이너 (Docker)

| 서비스     | 컨테이너명        | 이미지         | 포트        | 상태       |
| ---------- | ----------------- | -------------- | ----------- | ---------- |
| PostgreSQL | `secure-postgres` | `postgres`     | `5432:5432` | Up 4 weeks |
| Redis      | `secure-redis`    | `redis:latest` | `6379:6379` | Up 4 weeks |

**실행 명령:**

```bash
docker ps
```

**접속:**

```bash
# PostgreSQL
docker exec -it secure-postgres psql -U postgres

# Redis
docker exec -it secure-redis redis-cli
```

---

### 2. 웹 서버 (로컬)

| 프로젝트                    | 프레임워크 | 포트   | 실행 명령     |
| --------------------------- | ---------- | ------ | ------------- |
| **oni_care** (앱)           | Next.js 14 | `3000` | `npm run dev` |
| **oni_care_admin** (어드민) | Next.js 14 | `3001` | `npm run dev` |

---

## 데이터베이스

### PostgreSQL (Docker)

**연결 정보:**

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<your-password>
```

**데이터베이스 구조:**

```
postgres (DB 서버)
├── postgres (DB)          # 어드민 DB
│   ├── system_settings
│   ├── common_codes
│   ├── admin_access_logs
│   ├── contents
│   ├── content_categories
│   ├── content_media      # 컨텐츠 상세 이미지 (순서 관리)
│   ├── notices
│   └── points
│
└── oni_care_app (DB)      # 앱 DB (미래 확장용)
    └── (앱 전용 테이블)
```

**스키마 파일:**

- 어드민: `/Users/gfhs1/dev/oni_care_admin/schema.sql`
- 앱: `/Users/gfhs1/dev/oni_care/backend/db/schema.sql`

**주요 테이블:**

#### 1. `contents` (컨텐츠)

```sql
- id: UUID (PK)
- title: VARCHAR(500)
- content: TEXT
- thumbnail_url: TEXT                    -- 썸네일 (단일)
- category_id: INTEGER
- tags: TEXT[]
- visibility_scope: TEXT[]               -- [all, normal, affiliate, fs]
- company_codes: TEXT[]
- start_date, end_date: DATE
- store_visible: BOOLEAN
- quote_content, quote_source: TEXT
- has_quote: BOOLEAN
```

#### 2. `content_media` (컨텐츠 미디어)

```sql
- id: UUID (PK)
- content_id: UUID (FK → contents)
- media_type: VARCHAR(20)                -- image, video, thumbnail
- media_url: TEXT
- display_order: INT                     -- 순서 관리 ⭐
- alt_text: VARCHAR(500)
```

#### 3. `content_categories` (카테고리)

```sql
- id: SERIAL (PK)
- category_name: VARCHAR(100)
- category_type: VARCHAR(50)             -- interest, disease, exercise
- subcategory_types: TEXT[]
- description: TEXT
- icon_url: TEXT
- sort_order: INTEGER
```

---

### Redis (Docker)

**연결 정보:**

```env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=<your-password>
```

**용도:**

- 세션 관리
- 캐싱
- Rate Limiting

---

## 개발 환경

### 기술 스택

| 항목              | 기술               | 버전              |
| ----------------- | ------------------ | ----------------- |
| **Runtime**       | Node.js            | v20+              |
| **Framework**     | Next.js            | 14.2.3 / 14.2.33  |
| **Language**      | TypeScript         | 5.x               |
| **Styling**       | Tailwind CSS       | 3.4.1 / 4.x       |
| **DB Driver**     | node-postgres (pg) | 8.11.3            |
| **Auth**          | jose (JWT)         | 5.2.0             |
| **Password**      | bcryptjs           | 2.4.3             |
| **Data Fetching** | SWR                | 2.2.5 / 2.3.6     |
| **Icons**         | lucide-react       | 0.344.0 / 0.554.0 |

### 패키지 매니저

```bash
npm (oni_care_admin)
npm (oni_care)
```

---

## 파일 시스템

### 이미지 저장 구조

#### 심볼릭 링크 설정

```bash
# 어드민에서 앱 이미지 접근
oni_care_admin/public/images → oni_care/public/images

# 앱에서 어드민 업로드 접근
oni_care/public/uploads → oni_care_admin/public/uploads
```

#### 이미지 경로 규칙

| 이미지 종류            | 실제 저장 위치                              | URL 경로                  | 관리 주체 |
| ---------------------- | ------------------------------------------- | ------------------------- | --------- |
| **기존 컨텐츠 이미지** | `oni_care/public/images/`                   | `/images/...`             | 앱        |
| **새 썸네일**          | `oni_care_admin/public/uploads/thumbnails/` | `/uploads/thumbnails/...` | 어드민    |
| **새 상세 이미지**     | `oni_care_admin/public/uploads/details/`    | `/uploads/details/...`    | 어드민    |

#### 업로드 API

```typescript
// 어드민에서 이미지 업로드
POST /api/admin/upload
Content-Type: multipart/form-data

{
  file: File,
  folder: 'thumbnails' | 'details'
}

// 응답
{
  success: true,
  data: {
    url: '/uploads/thumbnails/1767333008543_qxmygf.png',
    filename: '1767333008543_qxmygf.png',
    originalName: 'image.png',
    size: 123456,
    mimeType: 'image/png'
  }
}
```

---

## 환경 변수

### oni_care_admin

```env
# Database
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development
```

### oni_care

```env
# Database (PostgreSQL - Docker)
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=oni_care_app
DB_USER=postgres
DB_PASSWORD=your-password

# API
NEXT_PUBLIC_API_URL=http://localhost:3000

# Server
PORT=3000
NODE_ENV=development
```

---

## 실행 방법

### 1. Docker 컨테이너 시작

```bash
# 이미 실행 중이면 스킵
docker ps

# 없으면 시작
docker start secure-postgres secure-redis
```

### 2. 데이터베이스 초기화 (최초 1회)

```bash
# 어드민 DB 스키마 적용
cd /Users/gfhs1/dev/oni_care_admin
psql -h 127.0.0.1 -U postgres -d postgres -f schema.sql

# 앱 DB 스키마 적용 (필요시)
cd /Users/gfhs1/dev/oni_care
psql -h 127.0.0.1 -U postgres -d postgres -f backend/db/schema.sql
```

### 3. 의존성 설치

```bash
# 어드민
cd /Users/gfhs1/dev/oni_care_admin
npm install

# 앱
cd /Users/gfhs1/dev/oni_care
npm install
```

### 4. 개발 서버 실행

```bash
# 터미널 1: 어드민
cd /Users/gfhs1/dev/oni_care_admin
npm run dev
# → http://localhost:3001

# 터미널 2: 앱
cd /Users/gfhs1/dev/oni_care
npm run dev
# → http://localhost:3000
```

### 5. 접속

- **어드민**: http://localhost:3001
- **앱**: http://localhost:3000

---

## 주요 API 엔드포인트

### 어드민 API

| 메서드 | 경로                            | 설명          |
| ------ | ------------------------------- | ------------- |
| POST   | `/api/auth/login`               | 로그인        |
| GET    | `/api/admin/contents`           | 컨텐츠 목록   |
| POST   | `/api/admin/contents`           | 컨텐츠 등록   |
| GET    | `/api/admin/contents/[id]`      | 컨텐츠 상세   |
| PUT    | `/api/admin/contents/[id]`      | 컨텐츠 수정   |
| DELETE | `/api/admin/contents/[id]`      | 컨텐츠 삭제   |
| POST   | `/api/admin/upload`             | 이미지 업로드 |
| GET    | `/api/admin/content-categories` | 카테고리 목록 |
| GET    | `/api/admin/notices`            | 공지사항 목록 |
| GET    | `/api/admin/points`             | 포인트 목록   |

---

## 데이터 흐름

### 컨텐츠 등록 플로우

```
1. 어드민에서 이미지 업로드
   ↓
2. POST /api/admin/upload
   → 파일 저장: oni_care_admin/public/uploads/
   ↓
3. 컨텐츠 등록 (POST /api/admin/contents)
   → contents 테이블: 썸네일 URL 저장
   → content_media 테이블: 상세 이미지 순서대로 저장
   ↓
4. 앱에서 조회
   → 심볼릭 링크를 통해 이미지 접근
   → /uploads/... 경로로 이미지 표시
```

---

## 트러블슈팅

### 1. 이미지가 안 보일 때

```bash
# 심볼릭 링크 확인
ls -la /Users/gfhs1/dev/oni_care_admin/public/
ls -la /Users/gfhs1/dev/oni_care/public/

# 링크가 없으면 생성
ln -s /Users/gfhs1/dev/oni_care/public/images /Users/gfhs1/dev/oni_care_admin/public/images
ln -s /Users/gfhs1/dev/oni_care_admin/public/uploads /Users/gfhs1/dev/oni_care/public/uploads
```

### 2. DB 연결 실패

```bash
# Docker 컨테이너 상태 확인
docker ps

# PostgreSQL 로그 확인
docker logs secure-postgres

# 직접 접속 테스트
psql -h 127.0.0.1 -U postgres -d postgres
```

### 3. 포트 충돌

```bash
# 포트 사용 확인
lsof -i :3000
lsof -i :3001
lsof -i :5432
lsof -i :6379

# 프로세스 종료
kill -9 <PID>
```

---

## 보안 주의사항

### 1. 환경 변수

- `.env` 파일은 절대 커밋하지 않음
- `.gitignore`에 `.env` 포함 확인

### 2. 비밀번호

- 하드코딩 금지
- 환경 변수로만 관리

### 3. 이미지 업로드

- 파일 타입 검증 (jpg, png, gif, webp만)
- 파일 크기 제한 (5MB)
- 파일명 랜덤 생성 (타임스탬프 + 랜덤)

---

## 향후 계획

### 1. 프로덕션 배포

- [ ] AWS ECS / EC2 배포
- [ ] RDS PostgreSQL 마이그레이션
- [ ] ElastiCache Redis 마이그레이션
- [ ] S3 이미지 스토리지 전환
- [ ] CloudFront CDN 적용

### 2. 모니터링

- [ ] 에러 트래킹 (Sentry)
- [ ] 로그 수집 (CloudWatch)
- [ ] 성능 모니터링 (New Relic)

### 3. CI/CD

- [ ] GitHub Actions
- [ ] 자동 테스트
- [ ] 자동 배포

---

## 참고 문서

- [Next.js 공식 문서](https://nextjs.org/docs)
- [PostgreSQL 공식 문서](https://www.postgresql.org/docs/)
- [Redis 공식 문서](https://redis.io/docs/)
- [Docker 공식 문서](https://docs.docker.com/)

---

**마지막 업데이트**: 2026-01-02  
**작성자**: GFHC Team
