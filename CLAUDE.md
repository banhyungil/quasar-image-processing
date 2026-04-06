# 코딩 가이드라인

아래 파일을 반드시 읽고 따를 것

- [docs/coding-guideLine.md)] - 코딩 가이드라인

# 프로젝트 구조 확인

아래 파일에서 프로젝트 구조 확인할 것

- [docs/architecture.md] - 프로젝트 구조

# 참고사항

아래 항목을 참고할 것

- vue template에서 ref는 자동 unwrap 된다.
- package.json에 설치된 라이브러리를 참고하여 개발진행한다.

## 타입 관리

- 프론트 타입은 `src/types/` 하위에 직접 정의

## Plan 관리 규칙

- plan mode 종료 후 반드시 `docs/plans/`에 플랜 파일을 복사할 것
- 사용자가 프로젝트 내에서 검토 후 승인할 때까지 구현 시작하지 말 것

## 학습 노트 규칙

- 사용자가 개념/용어를 질문하면, 대화 마지막에 해당 내용을 docs/note/ 하위 관련 md 파일에 정리할지 물어볼 것
- 기존 파일에 관련 섹션이 있으면 추가, 없으면 새 섹션 생성

## 수정 규칙

- `npx vue-tsc --noEmit`를 실행하여 0 errors를 확인할 것
- 코드 수정 후에는 Notion에 정리한다.
  - 문서 수정은 제외하고 기록
- 기능 추가인 경우 vitest, e2e 테스트 추가할 것이 있느지 검토하고 추가한다

### Notion 정리 지침

- DB: 개발 > 프로젝트 > 프로젝트 작업
- 데이터 소스 ID: `336705ff-d265-80a6-860d-000b6e9262ad`
- 속성 매핑:
  - `제목` (Title): 작업 제목
  - `프로젝트 정보` (Relation): `["https://www.notion.so/338705ffd26581038b9af26c8b47688e"]` (image-processing Frontend)
  - `작업 유형` (Multi-select): plan / feature / refactoring / bugfix / config / test / style / docs
  - `상태` (Status): 요청전 / 요청 / 승인대기 / 승인 / 완료
  - `시작일` (Date): 작업 시작일
  - `Git Branch명` (Text): 작업 브랜치명 (있는 경우)
  - `PR URL` (URL): PR 링크 (있는 경우)
- 페이지 아이콘: 작업 유형에 따라 지정
  - plan: 📋 / feature: ✨ / refactoring: ♻️ / bugfix: 🐛 / config: ⚙️ / test: 🧪 / style: 🎨 / docs: 📝
  - Multi-select 시 첫 번째 유형 기준
- 본문: 배경(왜), 변경 내용, 결과를 간결하게 작성
- 작업 단위는 하루가 아니라 "의미 단위" — 하루에 2건이면 2페이지, 이틀 걸렸으면 1페이지
