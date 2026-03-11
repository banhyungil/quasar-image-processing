import type { ParamFieldDef } from 'src/constants/imgPrc';

export interface CustomFilter {
  id: string;
  nm: string;
  description: string;
  code: string;
  params: ParamFieldDef[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFilterListResponse {
  items: CustomFilter[];
}

export interface CustomFilterCreate {
  nm: string;
  description: string;
  code: string;
  params: ParamFieldDef[];
}

export interface CustomFilterUpdate {
  nm?: string;
  description?: string;
  code?: string;
  params?: ParamFieldDef[];
}
