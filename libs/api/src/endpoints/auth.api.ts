import { apiClient } from '../client';
import type { IAuthResponse, ILoginDto, IRegisterDto } from '../types/auth.types';

const AUTH_PREFIX = '/api/auth';

export async function login(dto: ILoginDto): Promise<IAuthResponse> {
  const res = await apiClient.post(`${AUTH_PREFIX}/login`, dto);
  return { status: res.status };
}

export async function register(dto: IRegisterDto): Promise<IAuthResponse> {
  const res = await apiClient.post(`${AUTH_PREFIX}/register`, dto);
  return { status: res.status };
}

export async function logout(): Promise<void> {
  await apiClient.post(`${AUTH_PREFIX}/logout`);
}

export async function refresh(): Promise<void> {
  await apiClient.post(`${AUTH_PREFIX}/refresh`);
}
