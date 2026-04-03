import type { Node, Edge } from '@vue-flow/core';

import * as filesApi from 'src/apis/filesApi';
import type { TreeBatchStep, PreviewTempStep } from 'src/types/imgPrcType';
import type { AppNode, ProcessNodeData } from 'src/types/flowTypes';
import { PARAM_FIELDS, buildChainFilename } from 'src/constants/imgPrc';
import { API_HOST } from 'src/boot/axios';
import { useQuasar } from 'quasar';

import { SOURCE_NODE_ID } from './useFilterGraph';
import type { CropItem } from './useCropManager';

export interface ZoomPopup {
  id: string;
  nodeId: string;
  src: string;
  dziUrl?: string;
  title: string;
  loading?: boolean;
  nodeSteps: TreeBatchStep[];
}

/** 이미지 확대 팝업(모달리스, 복수), 다운로드, 체인 복사를 관리하는 composable */
export function useZoomPopup({
  nodes,
  edges,
  oOriginFileId,
  activeCrop,
  buildStepsToNode,
  addNodes,
  addEdges,
  relayout,
  processAllLeaves,
}: {
  nodes: Ref<AppNode[]>;
  edges: Ref<Edge[]>;
  oOriginFileId: Ref<number | null>;
  activeCrop: Ref<CropItem | null>;
  buildStepsToNode: (nodeId: string) => TreeBatchStep[];
  addNodes: (nodes: Node[]) => void;
  addEdges: (edges: Edge[]) => void;
  relayout: () => void;
  processAllLeaves: () => void;
}) {
  const $q = useQuasar();

  const zoomPopups = ref<ZoomPopup[]>([]);
  const cZoomedNodeIds = computed(() => new Set(zoomPopups.value.map((p) => p.nodeId)));

  /** 팝업 ID로 확대 팝업 닫기 */
  function closeZoomPopup(popupId: string) {
    zoomPopups.value = zoomPopups.value.filter((p) => p.id !== popupId);
  }

  /** 확대 팝업에서 임시 필터를 캔버스 노드에 반영 */
  function onApplyPreviewToCanvas(parentNodeId: string, steps: PreviewTempStep[]) {
    for (const step of steps) {
      const id = crypto.randomUUID();
      const newNode: Node<ProcessNodeData> = {
        id,
        type: 'filter',
        position: { x: 0, y: 0 },
        data: {
          algorithmNm: step.filterType,
          label: step.filterType,
          enabled: true,
          parameters: { ...(step.parameters ?? {}) },
          imageUrl: null,
          executionMs: null,
        },
      };
      const newEdge: Edge = {
        id: `e-${parentNodeId}-${id}`,
        source: parentNodeId,
        target: id,
        animated: true,
      };
      addNodes([newNode]);
      addEdges([newEdge]);
      parentNodeId = id;
    }
    void nextTick(() => {
      relayout();
      processAllLeaves();
    });
  }

  /** 원본 해상도로 노드 이미지를 확대 팝업에 표시 */
  async function onNodeZoom(nodeId: string) {
    if (zoomPopups.value.some((p) => p.nodeId === nodeId)) return;
    if (!oOriginFileId.value) return;

    const isSource = nodeId === SOURCE_NODE_ID;
    const crop = activeCrop.value;

    if (isSource && crop) {
      zoomPopups.value.push({
        id: crypto.randomUUID(),
        nodeId,
        title: `Crop: ${crop.label}`,
        nodeSteps: [],
        src: crop.nodeImageUrl,
      });
      return;
    }

    const steps = isSource ? [] : buildStepsToNode(nodeId);
    if (!isSource && steps.length === 0) return;
    if (!oOriginFileId.value) return;

    $q.loading.show({ message: '처리 중...' });
    const cropIdVal = crop?.cropId;
    const result = await filesApi
      .fetchOriginSizeUrl(
        oOriginFileId.value,
        steps,
        nodeId,
        cropIdVal ? { cropId: cropIdVal } : undefined,
      )
      .finally(() => $q.loading.hide())
      .catch(() => null);
    if (!result) return;

    const node = nodes.value.find((n) => n.id === nodeId);
    const filterData = node?.type === 'filter' ? node.data : null;
    const oUrl = (() => {
      const obj: { src: string; dziUrl?: string } = { src: '', dziUrl: undefined };
      if (result.imageUrl) obj.src = API_HOST + result.imageUrl;
      else if (result.dziUrl) obj.dziUrl = API_HOST + result.dziUrl;
      return obj;
    })();

    zoomPopups.value.push({
      id: crypto.randomUUID(),
      nodeId,
      title: isSource ? '원본 이미지' : (filterData?.label ?? '처리 결과'),
      nodeSteps: steps,
      ...oUrl,
    });
  }

  /** 노드의 처리 결과 이미지를 PNG로 다운로드 */
  async function onNodeDownload(nodeId: string) {
    if (!oOriginFileId.value) return;

    const steps = buildStepsToNode(nodeId);
    if (steps.length === 0) return;

    const blob = await filesApi.downloadNodeImage(oOriginFileId.value, steps, nodeId);
    const filterTypes = steps.map((s) => s.filterType);
    const chainSuffix = buildChainFilename(filterTypes);
    const baseName = 'image';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_${chainSuffix}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** 노드까지의 필터 체인 정보를 클립보드에 복사 */
  async function onCopyChain(nodeId: string) {
    const steps = buildStepsToNode(nodeId);
    if (steps.length === 0) return;

    const lines = steps.map((s, i) => {
      const fields = PARAM_FIELDS[s.filterType];
      const paramStr = fields
        ?.map((f) => {
          const v = s.parameters?.[f.key] ?? f.default;
          return `${f.label}=${JSON.stringify(v)}`;
        })
        .join(', ');
      return `${i + 1}. ${s.filterType}${paramStr ? ` (${paramStr})` : ''}`;
    });

    await navigator.clipboard.writeText(lines.join('\n'));
  }

  return {
    zoomPopups,
    cZoomedNodeIds,
    closeZoomPopup,
    onApplyPreviewToCanvas,
    onNodeZoom,
    onNodeDownload,
    onCopyChain,
  };
}
