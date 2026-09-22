import api from "./api";
import type { Milestone } from "../types";

export async function getMilestones(params?: Record<string, string>): Promise<Milestone[]> {
  const response = await api.get("/milestones/", { params });
  return response.data;
}

export async function createMilestone(data: Partial<Milestone>): Promise<Milestone> {
  const response = await api.post("/milestones/", data);
  return response.data;
}

export async function updateMilestone(id: number, data: Partial<Milestone>): Promise<Milestone> {
  const response = await api.patch(`/milestones/${id}/`, data);
  return response.data;
}

export async function deleteMilestone(id: number): Promise<void> {
  await api.delete(`/milestones/${id}/`);
}
