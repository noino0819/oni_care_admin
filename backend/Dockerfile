# 1. 실행 환경은 AWS에 맞춰 amd64로 설정
FROM --platform=linux/amd64 python:3.10-slim

WORKDIR /app

# 2. 시스템 패키지 설치 (PostgreSQL 클라이언트 등)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 3. 의존성 파일 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 앱 소스코드 복사
COPY app/ ./app/
COPY sql/ ./sql/

# 5. uploads 폴더 생성 (파일 업로드용)
RUN mkdir -p uploads

# 6. 앱 실행 포트 설정 (어드민 백엔드용 8001)
EXPOSE 8001

# 7. 앱 실행 명령어
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
