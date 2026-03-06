export interface ProcessStepBase {
  algorithmNm: string;
  stepOrder: number;
  parameters: Record<string, unknown>;
  isEnabled: boolean;
  presetId?: string | null;
  parentId?: string | null;
}

export interface ProcessStepCreate extends ProcessStepBase {}

export interface ProcessStepResponse extends ProcessStepBase {
  id: string;
  processId: string;
  createdAt: string;
  executionMs: number | null;
}

export interface ProcessCreate {
  nm: string;
  fileId: string;
  steps: ProcessStepCreate[];
}

export interface ProcessUpdate {
  nm?: string | null;
  finalFileId?: string | null;
  isLatest?: boolean | null;
  totalExecutionMs?: number | null;
  steps?: ProcessStepCreate[] | null;
}

export interface ProcessResponse {
  id: string;
  nm: string;
  fileId: string;
  finalFileId: string | null;
  isLatest: boolean;
  totalExecutionMs: number | null;
  createdAt: string;
  updatedAt: string;
  steps: ProcessStepResponse[];
}

export interface ProcessListResponse {
  items: ProcessResponse[];
}

export interface GetProcessesOptions {
  fileId?: string;
}
