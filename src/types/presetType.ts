export interface PresetStepBase {
  algorithmNm: string;
  stepOrder: number;
  parameters: Record<string, unknown>;
}

export interface PresetStepCreate extends PresetStepBase {
  clientId?: string | null;
  parentClientId?: string | null;
}

export interface PresetStepResponse extends PresetStepBase {
  id: string;
  parentId: string | null;
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
