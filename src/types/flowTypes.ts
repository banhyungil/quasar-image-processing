import type { PrcType } from './imgPrcType';

/** vue-flow 캔버스에서 사용하는 처리 노드 데이터 */
export interface ProcessNodeData {
  algorithmNm: PrcType;
  label: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
  thumbnail?: string | null;
  executionMs?: number | null;
}

/** vue-flow 소스(원본 이미지) 노드 데이터 */
export interface SourceNodeData {
  previewUrl: string | null;
}

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
