# 파악 정보

## Flex 클래스

| 클래스 | 역할 | CSS |
|--------|------|-----|
| `row` | flex 컨테이너 (가로 방향) | `display:flex; flex-direction:row` |
| `column` | flex 컨테이너 (세로 방향) | `display:flex; flex-direction:column` |
| `col` | flex 아이템 (남은 공간 채움) | `flex: 1 1 0%` |
| `col-6` 등 | flex 아이템 (비율 지정, 12칸 기준) | `width: 50%` 등 |

```html
<!-- 가로 배치: 컨테이너=row, 자식=col-* -->
<div class="row">
  <div class="col-6">왼쪽</div>
  <div class="col-6">오른쪽</div>
</div>

<!-- 세로 배치: 컨테이너=column, 자식=col -->
<div class="column">
  <div class="col">위</div>
  <div class="col">아래</div>
</div>
```

## Gutter (간격)

| 클래스 | 설명 |
|--------|------|
| `q-col-gutter-x-*` | 자식 col 간 가로 간격 (padding + 음수 margin) |
| `q-col-gutter-y-*` | 자식 col 간 세로 간격 |
| `q-col-gutter-*` | 가로 + 세로 동시 |
| `q-gutter-*` | 자식에 margin 적용 (col 없어도 동작) |

> **주의:** `q-col-gutter-*`는 음수 마진 방식이므로 CSS `gap`과 함께 쓰면 충돌함.
> `q-col-gutter-*` 없이 순수 `row`만 쓰는 경우엔 `gap` 사용 가능.

> **주의:** `q-col-gutter-*`는 자식 col에 padding을 주는 방식이라,
> 자식에 border가 있는 경우 col 래퍼 div를 별도로 두고 그 안에 border 요소를 넣어야 간격이 정상 적용됨.
