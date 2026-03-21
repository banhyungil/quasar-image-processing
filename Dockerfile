# 1단계: 빌드 (임시 컨테이너)
FROM node:22-alpine AS build

WORKDIR /app

# 소스 전체 복사 후 의존성 설치 (postinstall에서 quasar prepare 필요)
COPY . .
RUN npm ci

# 빌드 시 API 호스트 설정 (빈 문자열이면 상대 경로 → nginx 프록시 사용)
ARG VITE_API_HOST=""
ENV VITE_API_HOST=$VITE_API_HOST
RUN npx quasar build

# 2단계: 실행 (최종 이미지)
# # nginx로 SPA 서빙
FROM nginx:alpine

# nginx 설정 복사
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 빌드 결과물 복사
COPY --from=build /app/dist/spa /usr/share/nginx/html

EXPOSE 80
