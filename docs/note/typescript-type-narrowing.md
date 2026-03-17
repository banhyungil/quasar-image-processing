# TypeScript 타입 확정(narrowing) 기법 정리

## 1. Type Predicate (`is`)

`find`, `filter` 등 콜백에서 반환 타입을 확정할 때 사용.

```ts
// find 결과가 SourceNodeType으로 확정됨
const sourceNode = nodes.value.find(
  (n): n is SourceNodeType => n.type === 'source'
);
if (sourceNode) {
  sourceNode.data.previewUrl = '...'; // SourceNodeData로 추론
}

// filter에서도 동일하게 사용 가능
const filterNodes = nodes
  .filter((n): n is FilterNode => n.type === 'filter');
// filterNodes: FilterNode[]
```

- 가장 안전한 방식. 타입 체커가 실제 조건과 타입을 함께 검증.
- `find`, `filter`, 커스텀 가드 함수에서 사용.

---

## 2. Type Assertion (`as`)

타입 체커를 직접 지시. 간편하지만 런타임 검증 없음.

```ts
const sourceNode = nodes.value.find(
  (n) => n.type === 'source'
) as SourceNodeType | undefined;

// 주의: 실제 타입이 다르면 런타임 오류 발생 가능
```

- 외부 라이브러리 반환값 등 타입 추론이 불가능할 때 사용.
- 남용하면 타입 안전성이 떨어짐.

---

## 3. Type Guard (조건문 narrowing)

`if` 조건문 안에서 discriminated union의 타입이 자동 축소됨.

```ts
// AppNode = SourceNode | FilterNode (type 필드로 구분)
function handleNode(node: AppNode) {
  if (node.type === 'filter') {
    node.data.algorithmNm; // ProcessNodeData로 추론
  } else if (node.type === 'source') {
    node.data.previewUrl;  // SourceNodeData로 추론
  }
}
```

- discriminated union (`type` 같은 공통 리터럴 필드)이 있을 때 자동 동작.
- 별도 문법 불필요.

---

## 4. `satisfies` 키워드

객체 리터럴 생성 시 타입 호환성을 검증하되, 추론된 구체 타입을 유지.

```ts
// as를 쓰면 타입이 넓어짐
const node = { type: 'source', data: { previewUrl: null } } as SourceNodeType;
// node.type → string (넓은 타입)

// satisfies를 쓰면 구체 타입 유지 + 검증
const node = {
  type: 'source',
  data: { previewUrl: null },
} satisfies SourceNodeType;
// node.type → 'source' (리터럴 타입 유지)
```

- 객체 리터럴을 만들 때만 사용 가능.
- `find` 결과 등 기존 값의 타입 확정에는 사용 불가.

---

## 5. Non-null Assertion (`!`)

`null | undefined` 가능성을 무시.

```ts
const node = nodes.value.find((n) => n.type === 'source')!;
// undefined 가능성 제거 — 반드시 존재한다고 확신할 때만
```

- 값이 없으면 런타임 오류 발생.
- 확실할 때만 사용.

---

## 사용 가이드

| 상황 | 권장 방식 |
|---|---|
| `find`/`filter` 결과 타입 확정 | Type Predicate (`is`) |
| 조건문 안에서 union 타입 축소 | Type Guard (자동) |
| 객체 리터럴 생성 시 타입 검증 | `satisfies` |
| 외부 라이브러리 반환값 | `as` (불가피할 때) |
| null 가능성 제거 | `!` (확실할 때만) |
