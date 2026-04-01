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

export async function getPresets(): Promise<PresetListResponse> {
  const res = await api.get<PresetListResponse>('/presets');
  return res.data;
}

export async function getPreset(presetId: number): Promise<PresetResponse> {
  const res = await api.get<PresetResponse>(`/presets/${presetId}`);
  return res.data;
}

export async function createPreset(body: PresetCreate): Promise<PresetResponse> {
  const res = await api.post<PresetResponse>('/presets', body);
  return res.data;
}

export async function updatePreset(presetId: number, body: PresetUpdate): Promise<PresetResponse> {
  const res = await api.put<PresetResponse>(`/presets/${presetId}`, body);
  return res.data;
}

export async function deletePreset(presetId: number): Promise<void> {
  await api.delete(`/presets/${presetId}`);
}
