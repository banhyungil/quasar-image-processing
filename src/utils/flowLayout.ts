import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@vue-flow/core';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 200;
const SOURCE_NODE_HEIGHT = 180;

/**
 * dagre를 사용하여 노드 위치를 자동 계산한다.
 * 기존 노드/엣지 배열을 받아 position이 업데이트된 새 배열을 반환한다.
 */
export function applyDagreLayout<T extends Node>(
  nodes: T[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB',
): T[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 40, ranksep: 60 });

  for (const node of nodes) {
    const height = node.type === 'source' ? SOURCE_NODE_HEIGHT : NODE_HEIGHT;
    g.setNode(node.id, { width: NODE_WIDTH, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const height = node.type === 'source' ? SOURCE_NODE_HEIGHT : NODE_HEIGHT;
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - height / 2,
      },
    } as T;
  });
}
