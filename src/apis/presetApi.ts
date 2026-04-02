import { api } from 'src/boot/axios';
import type {
  PresetCreate,
  PresetUpdate,
  PresetResponse,
  PresetListResponse,
} from 'src/types/presetType';

export type {
  PresetStepBase,
  PresetStepCreate,
  PresetStepResponse,
  PresetCreate,
  PresetUpdate,
  PresetResponse,
  PresetListResponse,
} from 'src/types/presetType';

export async function fetchList(): Promise<PresetListResponse> {
  const res = await api.get<PresetListResponse>('/presets');
  return res.data;
}

export async function fetchById(presetId: number): Promise<PresetResponse> {
  const res = await api.get<PresetResponse>(`/presets/${presetId}`);
  return res.data;
}

export async function create(body: PresetCreate): Promise<PresetResponse> {
  const res = await api.post<PresetResponse>('/presets', body);
  return res.data;
}

export async function update(presetId: number, body: PresetUpdate): Promise<PresetResponse> {
  const res = await api.put<PresetResponse>(`/presets/${presetId}`, body);
  return res.data;
}

export async function remove(presetId: number): Promise<void> {
  await api.delete(`/presets/${presetId}`);
}
