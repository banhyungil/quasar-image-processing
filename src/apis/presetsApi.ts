import { api } from 'src/boot/axios';
import type {
  PresetCreate,
  PresetUpdate,
  PresetRes,
  PresetListRes,
} from 'src/types/presetType';

export type {
  PresetStepBase,
  PresetStepCreate,
  PresetStepRes,
  PresetCreate,
  PresetUpdate,
  PresetRes,
  PresetListRes,
} from 'src/types/presetType';

export async function fetchList(): Promise<PresetListRes> {
  const res = await api.get<PresetListRes>('/presets');
  return res.data;
}

export async function fetchById(presetId: number): Promise<PresetRes> {
  const res = await api.get<PresetRes>(`/presets/${presetId}`);
  return res.data;
}

export async function create(body: PresetCreate): Promise<PresetRes> {
  const res = await api.post<PresetRes>('/presets', body);
  return res.data;
}

export async function update(presetId: number, body: PresetUpdate): Promise<PresetRes> {
  const res = await api.put<PresetRes>(`/presets/${presetId}`, body);
  return res.data;
}

export async function remove(presetId: number): Promise<void> {
  await api.delete(`/presets/${presetId}`);
}
