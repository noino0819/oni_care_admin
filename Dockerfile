# 1. 실행 환경은 AWS에 맞춰 amd64로 설정
FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app

# 2. 로컬에서 이미 빌드된 결과물들을 복사
# (빌드 시 NEXT_PUBLIC_API_URL 환경변수 포함됨)
COPY package*.json ./
COPY .next ./.next
COPY public ./public
COPY node_modules ./node_modules

# 3. 앱 실행 포트 설정 (어드민용 3001)
EXPOSE 3001

# 4. 앱 실행 명령어
CMD ["npm", "start"]
