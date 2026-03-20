export type ApiErrorResponse = {
  message?: string;
  error?: string;
  statusCode?: number;
  details?: Record<string, unknown> | null;
};

export type ApiListMeta = {
  total: number;
  page: number;
  pageSize: number;
};

export type ApiListResponse<TItem> = {
  items: TItem[];
  meta: ApiListMeta;
};

export type PlaceholderProcessModel = {
  id: string;
  title: string;
  status: string;
  ownerName: string;
  currentStep: string;
};

export type AuthenticatedUserModel = {
  sub: string;
  email: string;
  role: string;
};
