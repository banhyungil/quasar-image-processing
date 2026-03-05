import { api } from 'src/boot/axios';

export async function getProcesses(options: GetProcessesOptions = {}): Promise<ProcessListResponse> {
  const res = await api.get<ProcessListResponse>('/processes', {
    params: {
      fileId: options.fileId ?? undefined,
    },
  });
  return res.data;
}

export async function getProcess(processId: string): Promise<ProcessResponse> {
  const res = await api.get<ProcessResponse>(`/processes/${processId}`);
  return res.data;
}

export async function createProcess(body: ProcessCreate): Promise<ProcessResponse> {
  const res = await api.post<ProcessResponse>('/processes', body);
  return res.data;
}

export async function updateProcess(
  processId: string,
  body: ProcessUpdate,
): Promise<ProcessResponse> {
  const res = await api.put<ProcessResponse>(`/processes/${processId}`, body);
  return res.data;
}

export async function deleteProcess(processId: string): Promise<void> {
  await api.delete(`/processes/${processId}`);
}

//ANCHOR - Types

export interface ProcessStepBase {
  algorithmNm: string;
  stepOrder: number;
  parameters: Record<string, unknown>;
  isEnabled: boolean;
  presetId?: string | null;
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
