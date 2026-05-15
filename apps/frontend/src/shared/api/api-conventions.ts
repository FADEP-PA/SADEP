export type ApiListMeta = {
  total: number;
  page?: number;
  pageSize?: number;
};

export type ApiListResponse<T> = {
  items: T[];
  meta: ApiListMeta;
};

export type ApiErrorResponse = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  path?: string;
  timestamp?: string;
  details?: Record<string, string | string[] | undefined>;
};
