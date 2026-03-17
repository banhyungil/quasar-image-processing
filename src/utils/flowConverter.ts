import type { Edge } from '@vue-flow/core';
import type { AppNode, SourceNode, FilterNode, FlatStep } from 'src/types/flowTypes';
import type { PrcType } from 'src/types/imgPrcType';
import { applyDagreLayout } from './flowLayout';

const SOURCE_NODE_ID = 'source';

/**
 * API flat list (steps) → vue-flow Node[] + Edge[] 변환
 * 소스 노드(원본 이미지)를 자동으로 추가한다.
 */
export function stepsToFlow(
  steps: FlatStep[],
  sourcePreviewUrl: string | null = null,
): { nodes: AppNode[]; edges: Edge[] } {
  const sourceNode: SourceNode = {
    id: SOURCE_NODE_ID,
    type: 'source',
    position: { x: 0, y: 0 },
    data: { previewUrl: sourcePreviewUrl },
  };

  const filterNodes: FilterNode[] = steps.map((step) => ({
    id: step.id,
    type: 'filter' as const,
    position: { x: 0, y: 0 },
    data: {
      algorithmNm: step.algorithmNm as PrcType,
      label: step.algorithmNm,
      enabled: step.isEnabled ?? true,
      parameters: { ...step.parameters },
      imageUrl: null,
      executionMs: step.executionMs ?? null,
    },
  }));

  const edges: Edge[] = steps.map((step) => ({
    id: `e-${step.parentId ?? SOURCE_NODE_ID}-${step.id}`,
    source: step.parentId ?? SOURCE_NODE_ID,
    target: step.id,
    animated: true,
  }));

  const allNodes: AppNode[] = [sourceNode, ...filterNodes];
  const layoutNodes = applyDagreLayout(allNodes, edges);

  return { nodes: layoutNodes, edges };
}

/**
 * vue-flow Node[] + Edge[] → API flat list (steps) 변환
 * 소스 노드는 제외, parentId=source → null로 매핑한다.
 */
export function flowToSteps(
  nodes: AppNode[],
  edges: Edge[],
): FlatStep[] {
  const parentMap = new Map<string, string | null>();
  for (const edge of edges) {
    const parentId = edge.source === SOURCE_NODE_ID ? null : edge.source;
    parentMap.set(edge.target, parentId);
  }

  return nodes
    .filter((n): n is FilterNode => n.type === 'filter')
    .map((node, index) => ({
      id: node.id,
      parentId: parentMap.get(node.id) ?? null,
      algorithmNm: node.data.algorithmNm,
      stepOrder: index,
      parameters: { ...node.data.parameters },
      isEnabled: node.data.enabled,
    }));
}
