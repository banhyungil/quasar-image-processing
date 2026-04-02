import { api } from 'src/boot/axios';
import type {
  GetProcessesOptions,
  ProcessCreate,
  ProcessUpdate,
  ProcessRes,
  ProcessListRes,
} from 'src/types/processType';

export type {
  ProcessStepBase,
  ProcessStepCreate,
  ProcessStepRes,
  ProcessCreate,
  ProcessUpdate,
  ProcessRes,
  ProcessListRes,
  GetProcessesOptions,
} from 'src/types/processType';

export async function fetchList(options: GetProcessesOptions = {}): Promise<ProcessListRes> {
  const res = await api.get<ProcessListRes>('/processes', {
    params: {
      fileId: options.fileId ?? undefined,
    },
  });
  return res.data;
}

export async function fetchById(processId: number): Promise<ProcessRes> {
  const res = await api.get<ProcessRes>(`/processes/${processId}`);
  return res.data;
}

export async function create(body: ProcessCreate): Promise<ProcessRes> {
  const res = await api.post<ProcessRes>('/processes', body);
  return res.data;
}

export async function update(processId: number, body: ProcessUpdate): Promise<ProcessRes> {
  const res = await api.put<ProcessRes>(`/processes/${processId}`, body);
  return res.data;
}

export async function remove(processId: number): Promise<void> {
  await api.delete(`/processes/${processId}`);
}
