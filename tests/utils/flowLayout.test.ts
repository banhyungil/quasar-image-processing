import { describe, it, expect } from 'vitest';
import { applyDagreLayout } from 'src/utils/flowLayout';
import type { Node, Edge } from '@vue-flow/core';

describe('applyDagreLayout', () => {
  // 검증: 기본 크기 노드들이 겹치지 않게 배치
  it('기본 크기 노드 — 겹침 없이 배치', () => {
    const nodes: Node[] = [
      { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: {} },
      { id: 'n1', type: 'filter', position: { x: 0, y: 0 }, data: {} },
      { id: 'n2', type: 'filter', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'source', target: 'n1' },
      { id: 'e2', source: 'n1', target: 'n2' },
    ];

    const result = applyDagreLayout(nodes, edges);

    // 모든 노드가 서로 다른 y 위치를 가져야 함 (TB 방향)
    const yPositions = result.map((n) => n.position.y);
    const uniqueY = new Set(yPositions);
    expect(uniqueY.size).toBe(3);

    // 순서 보장: source → n1 → n2 (위에서 아래)
    expect(result[0]!.position.y).toBeLessThan(result[1]!.position.y);
    expect(result[1]!.position.y).toBeLessThan(result[2]!.position.y);
  });

  // 검증: 커스텀 크기 노드가 겹치지 않게 배치
  it('커스텀 크기 노드 — 큰 노드 간격 반영', () => {
    const nodes: Node[] = [
      { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: {} },
      {
        id: 'n1',
        type: 'filter',
        position: { x: 0, y: 0 },
        data: { customWidth: 500, customThumbHeight: 350 },
      },
      { id: 'n2', type: 'filter', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'source', target: 'n1' },
      { id: 'e2', source: 'n1', target: 'n2' },
    ];

    const result = applyDagreLayout(nodes, edges);

    // 커스텀 크기 노드(n1)와 다음 노드(n2) 사이 간격이 기본보다 커야 함
    const n1 = result.find((n) => n.id === 'n1')!;
    const n2 = result.find((n) => n.id === 'n2')!;
    const gap = n2.position.y - n1.position.y;

    // 커스텀 thumbHeight(350) + chrome(80) + ranksep(60) 이상
    expect(gap).toBeGreaterThan(350);
  });

  // 검증: 분기(트리) 구조에서 형제 노드가 겹치지 않음
  it('분기 구조 — 형제 노드 가로 겹침 방지', () => {
    const nodes: Node[] = [
      { id: 'source', type: 'source', position: { x: 0, y: 0 }, data: {} },
      { id: 'n1', type: 'filter', position: { x: 0, y: 0 }, data: {} },
      { id: 'n2', type: 'filter', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: 'e1', source: 'source', target: 'n1' },
      { id: 'e2', source: 'source', target: 'n2' },
    ];

    const result = applyDagreLayout(nodes, edges);

    const n1 = result.find((n) => n.id === 'n1')!;
    const n2 = result.find((n) => n.id === 'n2')!;

    // 형제 노드는 같은 y, 다른 x
    expect(n1.position.y).toBe(n2.position.y);
    expect(n1.position.x).not.toBe(n2.position.x);
  });
});
