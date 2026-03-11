export interface CustomFilter {
  id: string;
  nm: string;
  description: string;
  code: string;
  params: Record<string, unknown>;
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
  params: Record<string, unknown>;
}

export interface CustomFilterUpdate {
  nm?: string;
  description?: string;
  code?: string;
  params?: Record<string, unknown>;
}
