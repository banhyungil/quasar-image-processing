# TODO: vue-flow 기반 노드 에디터 구현

## 현재 상황

### DB/API (완료)

- `t_preset_step`, `t_process_step` 테이블에 `parent_id` 컬럼 추가 완료
- 백엔드 스키마/레포/엔드포인트 모두 `parent_id` 지원
- API 응답: steps를 flat list + `parentId` 참조로 반환

### 프론트엔드 (미구현)

- `ImgPrcPage.vue`의 `NodeItem`에 `parentId` 필드 없음
- 노드를 flat list로만 관리 (드래그 정렬, 인덱스 기반)
- Preset/Process 저장·로드 시 `parentId` 무시
- 배치 처리 API도 flat list로만 전송

---

## 핵심 방향: vue-flow 캔버스로 통합

현재 "노드 리스트 + Flow 탭" 이원 구조를 **vue-flow 기반 단일 캔버스**로 통합한다.

- 노드 추가/삭제/연결/파라미터 편집을 캔버스 위에서 직접 수행
- 분기(같은 parent의 siblings)를 엣지 분기로 시각적 표현
- 각 노드에 중간 결과 이미지 프리뷰 표시 가능

---

## 구현 과제

### Phase 1: vue-flow 기본 세팅 + 데이터 모델

- [ ] `@vue-flow/core` 패키지 설치
- [ ] `NodeItem` 인터페이스 확장
  ```ts
  interface ProcessNode {
    id: string;
    parentId: string | null;
    algorithmNm: PrcType;
    label: string;
    enabled: boolean;
    parameters: Record<string, unknown>;
  }
  ```
- [ ] API flat list <-> vue-flow 노드/엣지 변환 유틸 작성
  - `stepsToFlow(steps)`: API 응답 → `Node[]` + `Edge[]`
  - `flowToSteps(nodes, edges)`: 캔버스 상태 → API 요청용 flat list (parentId 포함)
- [ ] 자동 레이아웃 (dagre) 적용 — 노드 위치 자동 배치

### Phase 2: 커스텀 노드 + 캔버스 인터랙션

- [ ] 커스텀 노드 컴포넌트 구현
  - 알고리즘명 + 아이콘
  - enabled 토글
  - 파라미터 편집 버튼 (클릭 시 사이드 패널)
  - 결과 이미지 프리뷰 썸네일 (Phase 4)
- [ ] 사이드바에서 알고리즘 드래그 → 캔버스에 드롭하여 노드 추가
- [ ] 노드 간 엣지 연결/해제로 parent-child 관계 설정
  - 소스 핸들(output) → 타겟 핸들(input) 연결
  - 연결 시 validation: 순환 참조 방지
- [ ] 노드 삭제 (자식 노드 처리 정책: 함께 삭제 or 연결 해제)
- [ ] 파라미터 편집 패널 (기존 옵션 패널 재활용)

### Phase 3: Preset / Process 연동

- [ ] **Preset 저장**: 캔버스 → `flowToSteps()` → `createPreset` API
  - 클라이언트 임시 ID → stepOrder 인덱스 기반 parentId 참조
- [ ] **Preset 로드**: API 응답 → `stepsToFlow()` → 캔버스에 렌더링
- [ ] **Process 로드**: process steps → 캔버스에 복원 (enabled, executionMs 표시)
- [ ] Preset 목록 패널 유지 (사이드바 or 드로어)

### Phase 4: 결과 시각화 (백엔드 API는 fastapi-server/docs/todo/TODO.md 참고)

- [ ] 캔버스 노드에 처리 결과 프리뷰 표시
  - 배치 처리 응답(노드별 base64 썸네일 + executionMs)을 각 노드에 매핑
  - executionMs 뱃지 표시
  - 노드별 결과 이미지를 클라이언트에 보관 (부분 재실행용)
  - 노드 클릭 시 원본 해상도 이미지 확대 보기
- [ ] 파라미터 변경 시 부분 재실행
  - 클라이언트가 보유한 부모 노드 결과 이미지 + 변경된 서브트리 steps를 전송
  - 기존 batch-tree API 재활용 (서버 무상태, 캐시 불필요)
  - 변경된 노드 + 하위 노드만 썸네일 갱신
- [ ] 분기별 최종 결과 비교 뷰 (리프 노드들 나란히 비교)

---

## 페이지 레이아웃 (변경 후)

```
+------------------+----------------------------------------+
|  사이드바         |  캔버스 (vue-flow)                       |
|  - 알고리즘 목록   |  [노드A] ──→ [노드B] ──→ [노드D]        |
|    (드래그 소스)   |              └──→ [노드C] ──→ [노드E]   |
|  - Preset 목록    |                                        |
|                  |  * 노드 클릭 → 파라미터 패널 열림          |
|                  |  * 엣지 연결 → parentId 설정              |
+------------------+----------------------------------------+
                   |  파라미터 패널 (선택된 노드의 옵션)         |
                   +----------------------------------------+
```

- 기존 "노드 리스트", "메인(이미지)", "Flow" 3탭 → **캔버스 단일 뷰**로 통합
- 원본 이미지 업로드는 캔버스 상단 툴바 or 시작 노드로 표현
- 처리 결과는 각 노드 내부 프리뷰 + 리프 노드 결과 비교 패널

---

## 핵심 설계 결정 사항

| 항목           | 선택지                                   | 비고                              |
| -------------- | ---------------------------------------- | --------------------------------- |
| 자동 레이아웃  | dagre (추천) vs elk                      | dagre가 가볍고 vue-flow 예제 풍부 |
| 노드 ID 체계   | 클라이언트 UUID → 저장 시 서버 UUID 매핑 | `crypto.randomUUID()` 활용        |
| 분기 실행 결과 | 중간=메모리 썸네일, 리프=파일 저장       | 저장 부담 최소화 + 프리뷰 제공    |
| 프리뷰 해상도  | 썸네일(~150px) + 클릭 시 원본 lazy load  | 노드 수 많을 때 전송량/렌더링 최적화 |
| 파라미터 편집  | 사이드 패널 (추천) vs 노드 내 인라인     | 사이드 패널이 공간 효율적         |
| 원본 이미지    | 시작 노드(Source Node)로 표현            | 캔버스 흐름에 자연스럽게 통합     |

---

## 참고 라이브러리

- `@vue-flow/core` — 메인 캔버스
- `@vue-flow/background` — 캔버스 배경 (그리드/도트)
- `@vue-flow/controls` — 줌/핏 컨트롤
- `@vue-flow/minimap` — 미니맵
- `dagre` — 자동 레이아웃 (노드 위치 계산)
