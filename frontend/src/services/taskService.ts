import api from "./api";
import type { Task } from "../types";

export async function getTasks(params?: Record<string, string>): Promise<Task[]> {
  const response = await api.get("/tasks/", { params });
  return response.data;
}

export async function createTask(data: Partial<Task>): Promise<Task> {
  const response = await api.post("/tasks/", data);
  return response.data;
}

export async function updateTask(id: number, data: Partial<Task>): Promise<Task> {
  const response = await api.patch(`/tasks/${id}/`, data);
  return response.data;
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}/`);
}
