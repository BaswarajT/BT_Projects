import api from "./api";
import type { Role, User } from "../types";

export interface ManagedUserInput {
  username: string;
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  company?: number | null;
  is_active?: boolean;
}

export async function getManagedUsers(search?: string): Promise<User[]> {
  const response = await api.get("/admin/users/", { params: search ? { search } : undefined });
  return response.data;
}

export async function getRecycleBinUsers(search?: string): Promise<User[]> {
  const response = await api.get("/admin/users/recycle-bin/", { params: search ? { search } : undefined });
  return response.data;
}

export async function createManagedUser(data: ManagedUserInput): Promise<User> {
  const response = await api.post("/admin/users/", data);
  return response.data;
}

export async function updateManagedUser(id: number, data: Partial<ManagedUserInput>): Promise<User> {
  const response = await api.patch(`/admin/users/${id}/`, data);
  return response.data;
}

export async function deleteManagedUser(id: number): Promise<void> {
  await api.delete(`/admin/users/${id}/`);
}

export async function restoreManagedUser(id: number): Promise<User> {
  const response = await api.post(`/admin/users/${id}/restore/`);
  return response.data;
}
