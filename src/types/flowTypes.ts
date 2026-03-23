import type { Node } from '@vue-flow/core';
import type { FilterType } from './imgPrcType';

/** vue-flow 캔버스에서 사용하는 처리 노드 데이터 */
export interface ProcessNodeData {
  algorithmNm: FilterType;
  label: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
  imageUrl?: string | null;
  executionMs?: number | null;
  /** 개별 노드 크기 (미지정 시 설정 프리셋 사용) */
  customWidth?: number;
  customThumbHeight?: number;
}

/** vue-flow 소스(원본 이미지) 노드 데이터 */
export interface SourceNodeData {
  previewUrl: string | null;
  thumbnailUrl: string | null;
  customWidth?: number;
  customThumbHeight?: number;
  width?: number | null;
  height?: number | null;
}

/** vue-flow 노드 타입 (source | filter) — data를 필수로 오버라이드 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SourceNode = Node<SourceNodeData, any, 'source'> & { data: SourceNodeData };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FilterNode = Node<ProcessNodeData, any, 'filter'> & { data: ProcessNodeData };
export type AppNode = SourceNode | FilterNode;

/** API flat list step (preset/process 공용) */
export interface FlatStep {
  id: string;
  parentId: string | null;
  algorithmNm: string;
  stepOrder: number;
  parameters: Record<string, unknown>;
  isEnabled?: boolean;
  executionMs?: number | null;
}
