import api from "./api";
import type { Client } from "../types";

export async function getClients(params?: Record<string, string>): Promise<Client[]> {
  const response = await api.get("/clients/", { params });
  return response.data;
}

export async function getClient(id: number): Promise<Client> {
  const response = await api.get(`/clients/${id}/`);
  return response.data;
}

export async function createClient(data: Partial<Client>): Promise<Client> {
  const response = await api.post("/clients/", data);
  return response.data;
}

export async function updateClient(id: number, data: Partial<Client>): Promise<Client> {
  const response = await api.patch(`/clients/${id}/`, data);
  return response.data;
}

export async function deleteClient(id: number): Promise<void> {
  await api.delete(`/clients/${id}/`);
}
