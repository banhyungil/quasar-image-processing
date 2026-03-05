import { api } from 'src/boot/axios';

export async function getPresets(): Promise<PresetListResponse> {
  const res = await api.get<PresetListResponse>('/presets');
  return res.data;
}

export async function getPreset(presetId: string): Promise<PresetResponse> {
  const res = await api.get<PresetResponse>(`/presets/${presetId}`);
  return res.data;
}

export async function createPreset(body: PresetCreate): Promise<PresetResponse> {
  const res = await api.post<PresetResponse>('/presets', body);
  return res.data;
}

export async function updatePreset(presetId: string, body: PresetUpdate): Promise<PresetResponse> {
  const res = await api.put<PresetResponse>(`/presets/${presetId}`, body);
  return res.data;
}

export async function deletePreset(presetId: string): Promise<void> {
  await api.delete(`/presets/${presetId}`);
}

//ANCHOR - Types

export interface PresetStepBase {
  algorithmNm: string;
  stepOrder: number;
  parameters: Record<string, unknown>;
  isEnabled: boolean;
}

export interface PresetStepCreate extends PresetStepBase {}

export interface PresetStepResponse extends PresetStepBase {
  id: string;
}

export interface PresetCreate {
  nm: string;
  description?: string | null;
  isSystem?: boolean;
  steps: PresetStepCreate[];
}

export interface PresetUpdate {
  nm?: string | null;
  description?: string | null;
  steps?: PresetStepCreate[] | null;
}

export interface PresetResponse {
  id: string;
  nm: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  steps: PresetStepResponse[];
}

export interface PresetListResponse {
  items: PresetResponse[];
}
