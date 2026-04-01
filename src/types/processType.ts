export interface ProcessStepBase {
  algorithmNm: string;
  stepOrder: number;
  parameters: Record<string, unknown>;
  isEnabled: boolean;
  presetId?: number | null;
  parentId?: number | null;
}

export interface ProcessStepCreate extends ProcessStepBase {
  clientId?: string | null;
  parentClientId?: string | null;
}

export interface ProcessStepResponse extends ProcessStepBase {
  id: number;
  processId: number;
  createdAt: string;
  executionMs: number | null;
}

export interface ProcessCreate {
  nm: string;
  fileId: number;
  steps: ProcessStepCreate[];
}

export interface ProcessUpdate {
  nm?: string | null;
  finalFileId?: number | null;
  isLatest?: boolean | null;
  totalExecutionMs?: number | null;
  steps?: ProcessStepCreate[] | null;
}

export interface ProcessResponse {
  id: number;
  nm: string;
  fileId: number;
  filePath: string | null;
  finalFileId: number | null;
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
  fileId?: number;
}
