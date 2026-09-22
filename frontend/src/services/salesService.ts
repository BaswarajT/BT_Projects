import api from "./api";
import type { SalesProject, SalesTeamPerformanceReport } from "../types";

export async function getSalesProjects(params?: Record<string, string>): Promise<SalesProject[]> {
  const response = await api.get("/sales-projects/", { params });
  return response.data;
}

export async function getSalesProject(id: number): Promise<SalesProject> {
  const response = await api.get(`/sales-projects/${id}/`);
  return response.data;
}

export async function createSalesProject(data: Partial<SalesProject>): Promise<SalesProject> {
  const response = await api.post("/sales-projects/", data);
  return response.data;
}

export async function updateSalesProject(id: number, data: Partial<SalesProject>): Promise<SalesProject> {
  const response = await api.patch(`/sales-projects/${id}/`, data);
  return response.data;
}

export async function deleteSalesProject(id: number): Promise<void> {
  await api.delete(`/sales-projects/${id}/`);
}

export async function convertToProject(id: number, code?: string): Promise<SalesProject> {
  const response = await api.post(`/sales-projects/${id}/convert-to-project/`, code ? { code } : {});
  return response.data;
}

export async function getSalesTeamPerformance(): Promise<SalesTeamPerformanceReport> {
  const response = await api.get("/reports/sales-team-performance/");
  return response.data;
}
