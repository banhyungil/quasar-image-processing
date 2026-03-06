import { api } from 'src/boot/axios';
import type {
  GetProcessesOptions,
  ProcessCreate,
  ProcessUpdate,
  ProcessResponse,
  ProcessListResponse,
} from 'src/types/processType';

export type {
  ProcessStepBase,
  ProcessStepCreate,
  ProcessStepResponse,
  ProcessCreate,
  ProcessUpdate,
  ProcessResponse,
  ProcessListResponse,
  GetProcessesOptions,
} from 'src/types/processType';

export async function getProcesses(
  options: GetProcessesOptions = {},
): Promise<ProcessListResponse> {
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
