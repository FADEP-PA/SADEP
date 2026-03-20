import { httpRequest } from './http-client';

type Primitive = string | number | boolean | null;
type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };

type ServiceRequestOptions = {
  token?: string;
  body?: JsonValue;
};

export function apiGet<TResponse>(path: string, options: ServiceRequestOptions = {}) {
  return httpRequest<TResponse>(path, {
    method: 'GET',
    token: options.token,
  });
}

export function apiPost<TResponse>(path: string, options: ServiceRequestOptions = {}) {
  return httpRequest<TResponse>(path, {
    method: 'POST',
    token: options.token,
    body: options.body,
  });
}
