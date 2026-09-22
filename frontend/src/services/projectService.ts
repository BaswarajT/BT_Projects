import api from "./api";
import type { Project } from "../types";

export async function getProjects(params?: Record<string, string>): Promise<Project[]> {
  const response = await api.get("/projects/", { params });
  return response.data;
}

export async function getProject(id: number): Promise<Project> {
  const response = await api.get(`/projects/${id}/`);
  return response.data;
}

export async function getRecycleBinProjects(params?: Record<string, string>): Promise<Project[]> {
  const response = await api.get("/projects/recycle-bin/", { params });
  return response.data;
}

export async function restoreProject(id: number): Promise<Project> {
  const response = await api.post(`/projects/${id}/restore/`);
  return response.data;
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  const response = await api.post("/projects/", data);
  return response.data;
}

export async function updateProject(id: number, data: Partial<Project>): Promise<Project> {
  const response = await api.patch(`/projects/${id}/`, data);
  return response.data;
}

export async function deleteProject(id: number): Promise<void> {
  await api.delete(`/projects/${id}/`);
}

export async function exportProjects(
  filetype: "csv" | "xlsx",
  params?: Record<string, string>
): Promise<void> {
  const response = await api.get("/projects/export/", {
    params: { ...params, filetype },
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = `projects.${filetype}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
