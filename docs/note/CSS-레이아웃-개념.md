# CSS 레이아웃 개념 정리

## Flex 자식 크기 결정 순서

flex 컨테이너에서 자식 크기는 다음 단계로 결정된다:

1. `flex-basis` (또는 `height`/`width`) → 초기 크기 제안
2. `min-height`/`min-width` → 최소 보장
3. `flex-grow` → 남은 공간 분배
4. `max-height`/`max-width` → 최대 제한

## flex-grow / flex-shrink / flex-basis

| 속성 | 역할 | 기본값 |
|------|------|--------|
| `flex-basis` | 초기 크기 (시작점) | `auto` (= 컨텐츠 크기) |
| `flex-grow` | 남은 공간을 얼마나 가져갈지 | `0` (안 늘어남) |
| `flex-shrink` | 공간 부족 시 얼마나 줄어들지 | `1` (줄어듦) |

### 축약형

```css
flex: 1       /* flex: 1 1 0%   — 균등 분배 (Quasar의 col) */
flex: auto    /* flex: 1 1 auto — 컨텐츠 기반 + 늘어남 */
flex: none    /* flex: 0 0 auto — 고정 크기 */
```

## min-height: auto 문제

flex 자식의 기본 `min-height`는 `auto`이다.
- 일반 블록 요소에서는 `min-height: auto = 0`
- **flex 자식에서는 `min-height: auto = 컨텐츠 크기`** (CSS 스펙)

이로 인해 컨텐츠가 많은 쪽이 더 커지는 문제가 발생한다.

### 해결: 균등 분배를 원할 때

```vue
<!-- ❌ 컨텐츠에 따라 불균등 -->
<div class="col">적은 컨텐츠</div>
<div class="col">많은 컨텐츠</div>

<!-- ✅ overflow-hidden 또는 min-h-0으로 해결 -->
<div class="col overflow-hidden">적은 컨텐츠</div>
<div class="col overflow-hidden">많은 컨텐츠</div>
```

`overflow-hidden`이나 `min-h-0`을 주면 `min-height: 0`이 되어 컨텐츠 무관하게 균등 분배된다.

## height: 0 + col 패턴

`height: 0` + `col`(flex-grow: 1) 조합은 "초기 크기 0에서 시작해 남은 공간을 flex-grow로 채운다"는 의미이다.

```vue
<q-page class="column" style="height: 0">
  <div class="col overflow-hidden">상단 (50%)</div>
  <div class="col overflow-hidden">하단 (50%)</div>
</q-page>
```

- `height: 0` → 컨텐츠 기준 크기 무시
- `col` (flex-grow: 1) → 부모의 남은 공간으로 채움
- `overflow-hidden` → min-height가 컨텐츠로 늘어나는 것 방지
- `q-page`의 `min-height`가 실제 화면 높이를 보장

## Quasar QPage 높이 구조

- `QPageContainer` — 헤더/푸터 제외한 남은 영역 높이를 계산
- `QPage` — 계산된 높이를 `min-height`로 자동 적용
- 일반 `<div>`는 이 높이 계산을 받지 못하므로 `QPage` 사용 필요

## 스크롤 부여

```vue
<!-- Quasar 유틸리티 -->
<div class="overflow-auto">넘치면 스크롤</div>
<div class="overflow-hidden">넘치면 잘림</div>

<!-- Quasar 컴포넌트 (커스텀 스크롤바) -->
<q-scroll-area style="height: 100%">내용</q-scroll-area>
```

## BEM과 Vue scoped

Vue의 `<style scoped>`가 네이밍 충돌을 방지해주므로 BEM의 필요성이 줄어든다. Tailwind 유틸리티 클래스로 대체하고, BEM은 복잡한 커스텀 스타일에서만 사용하는 것이 적절하다.
