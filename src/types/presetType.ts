export interface PresetStepBase {
  algorithmNm: string;
  stepOrder: number;
  parameters: Record<string, unknown>;
}

export interface PresetStepCreate extends PresetStepBase {
  clientId?: string | null;
  parentClientId?: string | null;
}

export interface PresetStepRes extends PresetStepBase {
  id: number;
  parentId: number | null;
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

export interface PresetRes {
  id: number;
  nm: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  steps: PresetStepRes[];
}

export interface PresetListRes {
  items: PresetRes[];
}
