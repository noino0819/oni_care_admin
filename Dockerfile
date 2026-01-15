# 1. 실행 환경은 AWS에 맞춰 amd64로 설정
FROM --platform=linux/amd64 node:18-alpine

WORKDIR /app

# 2. 로컬에서 이미 빌드된 결과물들을 통째로 복사
# (node_modules, .next, public, package.json 등 모든 파일)
COPY . .

# 3. 앱 실행 포트 설정 (어드민용 3001)
EXPOSE 3001

# 4. 앱 실행 명령어
CMD ["npm", "start"]
