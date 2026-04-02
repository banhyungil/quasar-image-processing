import { useVueFlow } from '@vue-flow/core';
import type { Node, Edge, Connection } from '@vue-flow/core';

import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { FilterType } from 'src/types/imgPrcType';
import type {
  ProcessNodeData,
  SourceNodeData,
  AppNode,
  SourceNode as SourceNodeType,
} from 'src/types/flowTypes';
import { applyDagreLayout } from 'src/utils/flowLayout';
import { useSettingsStore } from 'src/stores/settings-store';

import type { CustomFilter } from 'src/apis/customFiltersApi';

export const SOURCE_NODE_ID = 'source';

export interface FilterGraphCallbacks {
  onToggleParamPanel: (nodeId: string, isOpen?: boolean) => void;
  onProcessNodeThumbnail: (nodeId: string) => void;
  onProcessAllLeaves: () => void;
}

/** 노드/엣지 CRUD, 그래프 알고리즘, 레이아웃, 드래그드롭을 관리하는 composable */
export function useFilterGraph(
  oOriginFileId: Ref<number | null>,
  callbacks: FilterGraphCallbacks,
  externalNodes?: Ref<AppNode[]>,
  externalEdges?: Ref<Edge[]>,
) {
  const settingsStore = useSettingsStore();

  const { addNodes, addEdges, removeNodes, getSelectedNodes } = useVueFlow();

  // ── 노드/엣지 (외부 제공 또는 내부 생성) ────────────────────────────────────
  const nodes = externalNodes ?? ref<AppNode[]>([
    {
      id: SOURCE_NODE_ID,
      type: 'source',
      position: { x: 0, y: 0 },
      data: { previewUrl: null, thumbnailUrl: null },
    },
  ]);
  const edges = externalEdges ?? ref<Edge[]>([]);

  // ── 노드 선택 ──────────────────────────────────────────────────────────────
  const selectedNodeId = ref<string | null>(null);
  const cSelectedNodeIds = computed(() => new Set(getSelectedNodes.value.map((n) => n.id)));

  /** 노드 클릭 시 선택 상태 토글 및 파라미터 패널 표시 */
  function onNodeClick({ node }: { node: Node }) {
    if (selectedNodeId.value === node.id && getSelectedNodes.value.length <= 1) {
      selectedNodeId.value = null;
      callbacks.onToggleParamPanel(node.id, false);
      return;
    }

    selectedNodeId.value = node.id;
    if (node.type === 'filter') {
      callbacks.onToggleParamPanel(node.id);
    }
  }

  function onPaneClick() {
    selectedNodeId.value = null;
  }

  // ── 파라미터 기본값 ─────────────────────────────────────────────────────────
  /** PARAM_FIELDS에서 필터 타입에 맞는 기본 파라미터 객체를 생성 */
  function getDefaultParams(filterType: string): Record<string, unknown> {
    const fields = PARAM_FIELDS[filterType];
    if (!fields) return {};
    return Object.fromEntries(fields.map((f) => [f.key, f.default]));
  }

  // ── 노드 추가 ──────────────────────────────────────────────────────────────
  /** 필터 노드를 추가하고 선택된 노드(또는 마지막 리프)에 엣지 연결 */
  function addFilterNode(filterType: FilterType, label: string) {
    const id = crypto.randomUUID();

    const parentId = selectedNodeId.value ?? findLastLeaf();
    const parentNode = nodes.value.find((n) => n.id === parentId);
    const parentWidth = parentNode?.data?.customWidth;
    const parentThumbHeight = parentNode?.data?.customThumbHeight;

    const newNode: Node<ProcessNodeData> = {
      id,
      type: 'filter',
      position: { x: 0, y: 0 },
      data: {
        algorithmNm: filterType,
        label,
        enabled: true,
        parameters: getDefaultParams(filterType),
        imageUrl: null,
        executionMs: null,
        customWidth: parentWidth,
        customThumbHeight: parentThumbHeight,
      },
    };
    const newEdge: Edge = {
      id: `e-${parentId}-${id}`,
      source: parentId,
      target: id,
      animated: true,
    };

    addNodes([newNode]);
    addEdges([newEdge]);
    callbacks.onToggleParamPanel(id);

    void nextTick(() => {
      relayout();
      if (oOriginFileId.value) {
        callbacks.onProcessNodeThumbnail(id);
      }
    });
  }

  /** 커스텀 필터 노드를 추가하고 선택된 노드에 엣지 연결 */
  function addCustomFilterNode(cf: CustomFilter) {
    const id = crypto.randomUUID();
    const paramDefs = Array.isArray(cf.params)
      ? (cf.params as unknown as Array<{ key: string; default: unknown }>)
      : [];
    const defaultParams: Record<string, unknown> = {
      filterId: cf.id,
      ...Object.fromEntries(paramDefs.map((p) => [p.key, p.default])),
    };

    const newNode: Node<ProcessNodeData> = {
      id,
      type: 'filter',
      position: { x: 0, y: 0 },
      data: {
        algorithmNm: 'custom' as FilterType,
        label: cf.nm,
        enabled: true,
        parameters: defaultParams,
        imageUrl: null,
        executionMs: null,
      },
    };

    const parentId = selectedNodeId.value ?? findLastLeaf();
    const newEdge: Edge = {
      id: `e-${parentId}-${id}`,
      source: parentId,
      target: id,
      animated: true,
    };

    addNodes([newNode]);
    addEdges([newEdge]);
    callbacks.onToggleParamPanel(id);

    void nextTick(() => {
      relayout();
      if (oOriginFileId.value) {
        callbacks.onProcessNodeThumbnail(id);
      }
    });
  }

  // ── 노드 삭제 ──────────────────────────────────────────────────────────────
  /** 노드 삭제 후 자식 엣지를 부모에 재연결 */
  function removeFilterNode(nodeId: string) {
    if (nodeId === SOURCE_NODE_ID) return;

    const parentEdge = edges.value.find((e) => e.target === nodeId);
    const parentId = parentEdge?.source ?? SOURCE_NODE_ID;

    const childEdges = edges.value.filter((e) => e.source === nodeId);
    const newEdges: Edge[] = childEdges.map((ce) => ({
      id: `e-${parentId}-${ce.target}`,
      source: parentId,
      target: ce.target,
      animated: true,
    }));

    removeNodes([nodeId]);
    addEdges(newEdges);

    void nextTick(() => relayout());
  }

  // ── enabled 토글 ───────────────────────────────────────────────────────────
  /** 노드 enabled 토글 후 하위 리프 노드 재연산 트리거 */
  function toggleEnabled(nodeId: string) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node && node.type === 'filter') {
      node.data.enabled = !node.data.enabled;
      if (oOriginFileId.value) {
        const descendants = collectDescendantLeaves(nodeId);
        for (const leafId of descendants) {
          callbacks.onProcessNodeThumbnail(leafId);
        }
      }
    }
  }

  // ── 필터 변경 ──────────────────────────────────────────────────────────────
  /** 노드의 필터 타입을 변경하고 하위 리프 재연산 트리거 */
  function onChangeFilter(nodeId: string, filterType: FilterType, label: string, filterId?: number) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node || node.type !== 'filter') return;
    const data = node.data;
    data.algorithmNm = filterType;
    data.label = label;
    data.parameters = getDefaultParams(filterType);
    if (filterId) {
      data.parameters.filterId = filterId;
    }
    data.imageUrl = null;
    data.executionMs = null;

    if (oOriginFileId.value) {
      const descendants = collectDescendantLeaves(nodeId);
      for (const leafId of descendants) {
        callbacks.onProcessNodeThumbnail(leafId);
      }
    }
  }

  // ── 그래프 알고리즘 ─────────────────────────────────────────────────────────
  /** outgoing edge가 없는 마지막 노드(리프) ID를 반환 */
  function findLastLeaf(): string {
    const sources = new Set(edges.value.map((e) => e.source));
    const allNodeIds = nodes.value.map((n) => n.id);
    const leaves = allNodeIds.filter((id) => !sources.has(id));
    return leaves.length > 0 ? leaves[leaves.length - 1]! : SOURCE_NODE_ID;
  }

  /** source → targetNodeId 경로의 filter 노드 ID를 순서대로 반환 */
  function collectPathToNode(targetNodeId: string): string[] {
    const path: string[] = [];
    let current: string | null = targetNodeId;
    while (current && current !== SOURCE_NODE_ID) {
      path.unshift(current);
      const parentEdge = edges.value.find((e) => e.target === current);
      current = parentEdge?.source ?? null;
    }
    return path;
  }

  /** nodeId 포함 하위 모든 리프 노드 ID를 재귀 수집 */
  function collectDescendantLeaves(nodeId: string): string[] {
    const children = edges.value.filter((e) => e.source === nodeId).map((e) => e.target);
    if (children.length === 0) return [nodeId];
    const leaves: string[] = [];
    for (const childId of children) {
      leaves.push(...collectDescendantLeaves(childId));
    }
    return leaves;
  }

  // ── 엣지 연결 ──────────────────────────────────────────────────────────────
  /** 엣지 연결 (순환 참조 방지 포함) */
  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    if (hasCycle(connection.source, connection.target)) return;

    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      animated: true,
    };
    addEdges([newEdge]);
  }

  /** source에서 역방향 탐색하여 target에 도달 가능하면 순환으로 판단 */
  function hasCycle(source: string, target: string): boolean {
    const visited = new Set<string>();
    const stack = [source];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === target) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const edge of edges.value) {
        if (edge.target === current) {
          stack.push(edge.source);
        }
      }
    }
    return false;
  }

  // ── 레이아웃 ───────────────────────────────────────────────────────────────
  /** dagre 알고리즘으로 노드 위치를 자동 배치 */
  function relayout() {
    const layouted = applyDagreLayout(nodes.value, edges.value);
    for (const ln of layouted) {
      const node = nodes.value.find((n) => n.id === ln.id);
      if (node) {
        node.position = { ...ln.position };
      }
    }
  }

  // ── 노드 사이즈 ───────────────────────────────────────────────────────────
  const nodeSizeInput = ref<number>(settingsStore.nodeSize.width);

  /** 개별 노드의 커스텀 사이즈 설정 */
  function setNodeSize(node: Node, width: number, thumbHeight: number) {
    if (node.type === 'filter') {
      (node.data as ProcessNodeData).customWidth = width;
      (node.data as ProcessNodeData).customThumbHeight = thumbHeight;
    } else if (node.type === 'source') {
      (node.data as SourceNodeData).customWidth = width;
      (node.data as SourceNodeData).customThumbHeight = thumbHeight;
    }
  }

  /** nodeSizeInput 값을 전체 노드에 일괄 적용 */
  function applyNodeSizeAll() {
    const w = Math.max(120, nodeSizeInput.value);
    const ratio = settingsStore.nodeSize.thumbHeight / settingsStore.nodeSize.width;
    const h = Math.round(w * ratio);
    for (const node of nodes.value) {
      setNodeSize(node, w, h);
    }
  }

  /** 노드 리사이즈 완료 시 해당 노드 + 다중 선택 노드에 사이즈 적용 */
  function onNodeResize(nodeId: string, width: number, thumbHeight: number) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (node) setNodeSize(node, width, thumbHeight);

    for (const sn of getSelectedNodes.value) {
      if (sn.id !== nodeId) setNodeSize(sn, width, thumbHeight);
    }
  }

  // ── 캔버스 초기화 ──────────────────────────────────────────────────────────
  /** 캔버스를 source 노드만 남기고 초기화 */
  function resetCanvas(imageUrl: string | null, fileId: number | null, apiHost: string) {
    nodes.value = [
      {
        id: SOURCE_NODE_ID,
        type: 'source',
        position: { x: 0, y: 0 },
        data: {
          previewUrl: imageUrl,
          thumbnailUrl: fileId ? `${apiHost}/api/files/thumbnail/${fileId}` : null,
        },
      },
    ];
    edges.value = [];
    selectedNodeId.value = null;
  }

  // ── 사이드바 드래그 → 캔버스 드롭 ─────────────────────────────────────────
  /** 사이드바에서 캔버스로의 드래그 시작 시 dataTransfer 설정 */
  function onSidebarDragStart(event: DragEvent, filterType: FilterType, label: string) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('application/vueflow-filtertype', filterType);
    event.dataTransfer.setData('application/vueflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  }

  function onCanvasDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  /** 캔버스에 드롭된 필터를 노드로 추가. 커스텀 필터는 resolveCustomFilter로 조회 */
  function onCanvasDrop(event: DragEvent, resolveCustomFilter?: (filterId: string) => CustomFilter | undefined) {
    const filterType = event.dataTransfer?.getData('application/vueflow-filtertype') as
      | FilterType
      | undefined;
    const label = event.dataTransfer?.getData('application/vueflow-label');
    if (!filterType || !label) return;

    if (filterType === 'custom') {
      const filterId = event.dataTransfer?.getData('application/vueflow-filter-id');
      if (filterId && resolveCustomFilter) {
        const cf = resolveCustomFilter(filterId);
        if (cf) addCustomFilterNode(cf);
      }
      return;
    }

    addFilterNode(filterType, label);
  }

  // ── computed ───────────────────────────────────────────────────────────────
  const cHasFilterNodes = computed(() => nodes.value.some((n) => n.type === 'filter'));

  return {
    nodes,
    edges,
    selectedNodeId,
    cSelectedNodeIds,
    cHasFilterNodes,
    nodeSizeInput,
    SOURCE_NODE_ID,
    getDefaultParams,
    onNodeClick,
    onPaneClick,
    addFilterNode,
    addCustomFilterNode,
    removeFilterNode,
    toggleEnabled,
    onChangeFilter,
    findLastLeaf,
    collectPathToNode,
    collectDescendantLeaves,
    onConnect,
    hasCycle,
    relayout,
    setNodeSize,
    applyNodeSizeAll,
    onNodeResize,
    resetCanvas,
    onSidebarDragStart,
    onCanvasDragOver,
    onCanvasDrop,
  };
}
