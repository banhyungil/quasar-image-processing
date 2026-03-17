# Quasar Util Classes (자주 쓰는 것들)

실무에서 자주 쓰는 Quasar CSS Helper 클래스를 빠르게 참고할 수 있게 정리했습니다.

## 1) Spacing (margin / padding)

- `q-ma-md`: 전체 margin
- `q-mt-sm`, `q-mr-lg`, `q-mb-xs`, `q-ml-xl`: 방향별 margin
- `q-mx-md`, `q-my-sm`: 축 기준 margin
- `q-pa-md`: 전체 padding
- `q-pt-sm`, `q-pr-lg`, `q-pb-xs`, `q-pl-xl`: 방향별 padding
- `q-px-md`, `q-py-sm`: 축 기준 padding
- `q-ma-none`, `q-pa-none`: 여백 제거

예시:

```html
<div class="q-pa-md q-mb-sm">...</div>
```

## 2) Flex / Layout

- `row`, `column`: flex 방향
- `items-start`, `items-center`, `items-end`, `items-stretch`: 교차축 정렬
- `justify-start`, `justify-center`, `justify-end`, `justify-between`, `justify-around`, `justify-evenly`: 주축 정렬
- `self-start`, `self-center`, `self-end`: 개별 아이템 정렬
- `wrap`, `no-wrap`, `reverse-wrap`: 줄바꿈
- `col`, `col-6`, `col-auto`: 컬럼 폭

예시:

```html
<div class="row items-center justify-between q-pa-md">...</div>
```

## 3) Display / Visibility

- `block`, `inline-block`: display 제어
- `hidden`: 화면에서 숨김
- `invisible`: 자리 유지 + 보이지 않음
- `fit`: 부모 크기에 맞춤
- `fullscreen`: 화면 꽉 채움

예시:

```html
<div class="hidden">...</div>
```

## 4) Typography

- `text-h1` ~ `text-h6`: 제목 크기
- `text-subtitle1`, `text-subtitle2`, `text-body1`, `text-body2`, `text-caption`, `text-overline`: 텍스트 스타일
- `text-weight-thin`, `text-weight-light`, `text-weight-regular`, `text-weight-medium`, `text-weight-bold`, `text-weight-bolder`: 굵기
- `text-italic`: 이탤릭
- `text-uppercase`, `text-lowercase`, `text-capitalize`: 대소문자 변환
- `text-left`, `text-center`, `text-right`: 정렬

예시:

```html
<div class="text-h6 text-weight-bold">Title</div>
```

## 5) Color (Theme)

- `bg-primary`, `bg-secondary`, `bg-accent`, `bg-positive`, `bg-negative`, `bg-warning`, `bg-info`
- `text-primary`, `text-secondary`, `text-accent`, `text-positive`, `text-negative`, `text-warning`, `text-info`
- `text-white`, `text-black`

예시:

```html
<div class="bg-primary text-white q-pa-sm">...</div>
```

## 6) Border / Radius / Shadow

- `rounded-borders`: 기본 라운드
- `bordered`: 테두리
- `no-border`: 테두리 제거
- `shadow-1` ~ `shadow-24`: 그림자 강도
- `no-shadow`: 그림자 제거

예시:

```html
<div class="rounded-borders shadow-2 q-pa-md">...</div>
```

## 7) Position / Cursor

- `relative-position`, `absolute`, `fixed`
- `cursor-pointer`, `cursor-not-allowed`

예시:

```html
<div class="relative-position cursor-pointer">...</div>
```

## 8) Drawer mini 관련 (현재 프로젝트에서 유용)

- `q-mini-drawer-hide`: mini 상태에서 숨김
- `q-mini-drawer-only`: mini 상태에서만 표시

예시:

```html
<q-item-label class="q-mini-drawer-hide">Menu</q-item-label>
<q-tooltip class="q-mini-drawer-only">Menu</q-tooltip>
```

---

## 실무 팁

- Quasar 컴포넌트 prop으로 가능한 건 prop 우선(`dense`, `flat`, `outlined` 등)
- 유틸 클래스는 레이아웃/간격/정렬 위주로 사용
- 반복되는 클래스 조합은 컴포넌트/SCSS로 묶어 관리
