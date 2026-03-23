import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@vue-flow/core';
import { NODE_SIZE_PRESETS } from 'src/stores/settings-store';

const DEFAULT_WIDTH = NODE_SIZE_PRESETS.md.width;
const DEFAULT_THUMB_HEIGHT = NODE_SIZE_PRESETS.md.thumbHeight;
// 헤더 + 파라미터 영역 등 썸네일 외 높이 여유분
const NODE_CHROME_HEIGHT = 80;

function getNodeDimensions(node: Node): { width: number; height: number } {
  const customW = node.data?.customWidth as number | undefined;
  const customH = node.data?.customThumbHeight as number | undefined;
  const width = customW ?? DEFAULT_WIDTH;
  const thumbHeight = customH ?? DEFAULT_THUMB_HEIGHT;
  return { width, height: thumbHeight + NODE_CHROME_HEIGHT };
}

/**
 * dagre를 사용하여 노드 위치를 자동 계산한다.
 * 각 노드의 실제 크기를 반영하여 겹침을 방지한다.
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
    const { width, height } = getNodeDimensions(node);
    g.setNode(node.id, { width, height });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const { width, height } = getNodeDimensions(node);
    return {
      ...node,
      position: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
    } as T;
  });
}
