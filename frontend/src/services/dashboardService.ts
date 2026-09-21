import api from "./api";
import type { DashboardSummary } from "../types";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get("/dashboard/summary/");
  return response.data;
}
