import { useDebounceFn } from '@vueuse/core';
import type { Edge } from '@vue-flow/core';

import * as filesApi from 'src/apis/filesApi';
import type { TreeBatchStep } from 'src/types/imgPrcType';
import type { AppNode, ProcessNodeData } from 'src/types/flowTypes';
import { API_BASE_URL } from 'src/boot/axios';
import { useSettingsStore } from 'src/stores/settings-store';

import { collectDescendantLeaves, collectPathToNode, SOURCE_NODE_ID } from './useFilterGraph';

/** 노드 썸네일 연산, 파라미터 변경 debounce + abort, step 구축을 관리하는 composable */
export function useThumbnailProcessor({
  nodes,
  edges,
  oOriginFileId,
  activeCropId,
}: {
  nodes: Ref<AppNode[]>;
  edges: Ref<Edge[]>;
  oOriginFileId: Ref<number | null>;
  activeCropId: Ref<string | null>;
}) {
  const settingsStore = useSettingsStore();

  let paramAbortController: AbortController | null = null;

  /** 특정 노드까지의 경로에 대해 batch-tree API를 호출하여 썸네일을 갱신 */
  async function processNodeThumbnail(targetNodeId: string, options?: { signal?: AbortSignal }) {
    const fileId = oOriginFileId.value;
    if (!fileId) return;

    const pathNodeIds = collectPathToNode(targetNodeId, edges.value);
    const steps: TreeBatchStep[] = [];
    const enabledIds = new Set<string>();

    for (const nodeId of pathNodeIds) {
      const node = nodes.value.find((n) => n.id === nodeId);
      if (!node || node.type !== 'filter') continue;
      const data = node.data;

      if (!data.enabled) continue;

      let parentId: string | null = null;
      const parentEdge = edges.value.find((e) => e.target === nodeId);
      let cursor = parentEdge?.source ?? null;
      while (cursor && cursor !== SOURCE_NODE_ID) {
        if (enabledIds.has(cursor)) {
          parentId = cursor;
          break;
        }
        const pe = edges.value.find((e) => e.target === cursor);
        cursor = pe?.source ?? null;
      }

      enabledIds.add(nodeId);
      steps.push({
        nodeId,
        filterType: data.algorithmNm,
        parameters: { ...data.parameters },
        parentId,
      });
    }
    if (steps.length === 0) return;

    const thumbSize = settingsStore.isFullResolution
      ? undefined
      : settingsStore.nodeSize.thumbResolution;

    const activeCropIdVal = activeCropId.value ?? undefined;

    const leafIds = collectDescendantLeaves(SOURCE_NODE_ID, edges.value);
    const returnNodeIds = settingsStore.hideIntermediateNodes ? leafIds : undefined;

    const result = await filesApi.batchTreeProcessing(fileId, steps, {
      thumbnailSize: thumbSize,
      cropId: activeCropIdVal,
      returnNodeIds,
      signal: options?.signal,
    });

    for (const nr of result.results) {
      const node = nodes.value.find((n) => n.id === nr.nodeId);
      if (node && node.type === 'filter') {
        if (nr.imageUrl) {
          node.data.imageUrl = nr.imageUrl.startsWith('data:')
            ? nr.imageUrl
            : API_BASE_URL + nr.imageUrl;
          node.data.executionMs = nr.executionMs;
          node.data.imageWidth = nr.width;
          node.data.imageHeight = nr.height;
        } else {
          node.data.imageUrl = null;
          node.data.executionMs = null;
          node.data.imageWidth = null;
          node.data.imageHeight = null;
        }
      }
    }
  }

  /** 모든 리프 노드에 대해 썸네일 연산 실행 */
  function processAllLeaves() {
    if (!oOriginFileId.value) return;
    const leaves = collectDescendantLeaves(SOURCE_NODE_ID, edges.value);
    for (const leafId of leaves) {
      void processNodeThumbnail(leafId);
    }
  }

  /** 타겟 노드까지의 steps를 구축한다 (zoom, download 공용). */
  function buildStepsToNode(nodeId: string): TreeBatchStep[] {
    const pathNodeIds = collectPathToNode(nodeId, edges.value);
    const steps: TreeBatchStep[] = [];
    const enabledIds = new Set<string>();

    for (const nid of pathNodeIds) {
      const node = nodes.value.find((n) => n.id === nid);
      if (!node || node.type !== 'filter') continue;
      if (!node.data.enabled) continue;

      let parentId: string | null = null;
      const parentEdge = edges.value.find((e) => e.target === nid);
      let cursor = parentEdge?.source ?? null;
      while (cursor && cursor !== SOURCE_NODE_ID) {
        if (enabledIds.has(cursor)) {
          parentId = cursor;
          break;
        }
        const pe = edges.value.find((e) => e.target === cursor);
        cursor = pe?.source ?? null;
      }

      enabledIds.add(nid);
      steps.push({
        nodeId: nid,
        filterType: node.data.algorithmNm,
        parameters: { ...node.data.parameters },
        parentId,
      });
    }
    return steps;
  }

  /** 파라미터 적용 (Apply 버튼) */
  function onParamApply(updated: ProcessNodeData, optionPanelTarget: string | null) {
    if (!oOriginFileId.value || !optionPanelTarget) return;

    const node = nodes.value.find((n) => n.id === optionPanelTarget);
    if (node && node.type === 'filter') {
      node.data.parameters = { ...updated.parameters };
    }

    const descendants = collectDescendantLeaves(optionPanelTarget, edges.value);
    for (const leafId of descendants) {
      void processNodeThumbnail(leafId);
    }
  }

  /** 파라미터 실시간 변경: debounce + abort */
  const onParamChange = useDebounceFn(
    (parameters: Record<string, unknown>, optionPanelTarget: string | null) => {
      if (!oOriginFileId.value || !optionPanelTarget) return;

      paramAbortController?.abort();
      paramAbortController = new AbortController();

      const node = nodes.value.find((n) => n.id === optionPanelTarget);
      if (node && node.type === 'filter') {
        node.data.parameters = { ...parameters };
      }

      const signal = paramAbortController.signal;
      const descendants = collectDescendantLeaves(optionPanelTarget, edges.value);
      for (const leafId of descendants) {
        void processNodeThumbnail(leafId, { signal });
      }
    },
    200,
  );

  return {
    processNodeThumbnail,
    processAllLeaves,
    buildStepsToNode,
    onParamApply,
    onParamChange,
  };
}
