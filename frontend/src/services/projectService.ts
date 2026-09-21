import api from "./api";
import type { Project } from "../types";

export async function getProjects(): Promise<Project[]> {
  const response = await api.get("/projects/");
  return response.data;
}

export async function getProject(id: number): Promise<Project> {
  const response = await api.get(`/projects/${id}/`);
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
