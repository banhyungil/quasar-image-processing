import { api } from 'src/boot/axios';
import type {
  CustomFilter,
  CustomFilterCreate,
  CustomFilterUpdate,
  CustomFilterListRes,
} from 'src/types/customFilterType';

export type {
  CustomFilter,
  CustomFilterCreate,
  CustomFilterUpdate,
  CustomFilterListRes,
} from 'src/types/customFilterType';

export async function fetchList(): Promise<CustomFilterListRes> {
  const res = await api.get<CustomFilterListRes>('/custom-filters');
  return res.data;
}

export async function fetchById(id: number): Promise<CustomFilter> {
  const res = await api.get<CustomFilter>(`/custom-filters/${id}`);
  return res.data;
}

export async function create(body: CustomFilterCreate): Promise<CustomFilter> {
  const res = await api.post<CustomFilter>('/custom-filters', body);
  return res.data;
}

export async function update(id: number, body: CustomFilterUpdate): Promise<CustomFilter> {
  const res = await api.put<CustomFilter>(`/custom-filters/${id}`, body);
  return res.data;
}

export async function remove(id: number): Promise<void> {
  await api.delete(`/custom-filters/${id}`);
}

export async function testCustomFilter(
  id: number,
  image: File | Blob,
  parameters?: Record<string, unknown>,
): Promise<Blob> {
  const form = new FormData();
  form.append('image', image);
  if (parameters) {
    form.append('parameters', JSON.stringify(parameters));
  }

  const res = await api.post<Blob>(`/custom-filters/${id}/test`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
  return res.data;
}
