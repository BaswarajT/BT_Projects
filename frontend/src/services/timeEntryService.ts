import api from "./api";
import type { TimeEntry } from "../types";

export async function getTimeEntries(params?: Record<string, string>): Promise<TimeEntry[]> {
  const response = await api.get("/time-entries/", { params });
  return response.data;
}

export async function createTimeEntry(data: Partial<TimeEntry>): Promise<TimeEntry> {
  const response = await api.post("/time-entries/", data);
  return response.data;
}

export async function updateTimeEntry(id: number, data: Partial<TimeEntry>): Promise<TimeEntry> {
  const response = await api.patch(`/time-entries/${id}/`, data);
  return response.data;
}

export async function deleteTimeEntry(id: number): Promise<void> {
  await api.delete(`/time-entries/${id}/`);
}
