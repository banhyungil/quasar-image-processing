# 프로젝트 개요

Quasar(Vue 3) 기반 이미지 처리 웹 앱.
Python 백엔드(FastAPI)와 연동하여 OpenCV 이미지 처리 결과를 시각화한다.

## 기술 스택

- **프레임워크:** Quasar (Vue 3, Composition API, `<script setup>`)
- **언어:** TypeScript
- **HTTP 클라이언트:** Axios (`src/boot/axios.ts`, baseURL: `http://127.0.0.1:8000/api`)
- **라우터:** Vue Router (WebHistory 모드)
- **패키지 매니저:** pnpm

## 프로젝트 구조

```
src/
├── apis/                    # API 함수 관리
│   └── ...
├── boot/
│   └── axios.ts             # Axios 인스턴스 설정 및 등록
├── components/
│   └── EssentialLink.vue    # 사이드바 메뉴 링크 컴포넌트
├── constants/               # 상수 관리
│   └── ...
├── css/
│   ├── app.scss             # 전역 스타일
│   └── quasar.variables.scss # Quasar 테마 변수
├── layouts/                  # 공통 레이아웃
│   └── ...
├── pages/
│   └── ErrorNotFound.vue    # 404 페이지
├── router/
│   ├── index.ts             # 라우터 설정 (WebHistory)
│   └── routes.ts            # 라우트 정의
├── stores/
│   └── index.ts             # Pinia 스토어 설정
├── types/                   # 타입 집합
│   └── api.d.ts             # openapi-typescript 자동 생성 타입
└── App.vue                  # 루트 컴포넌트
```

## 타입 관리

1. API 타입 관리

- `src/types/api.d.ts`: openapi-typescript로 자동 생성. **직접 수정 금지**
  - `npm run gen:types`

2. 일반 타입 관리

- <파일이름>Type.ts 형식으로 타입관리.
