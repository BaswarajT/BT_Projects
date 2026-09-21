import api from "./api";
import type { ProjectOverrunReport, ResourceUtilizationReport } from "../types";

export async function getResourceUtilization(
  params?: Record<string, string>
): Promise<ResourceUtilizationReport> {
  const response = await api.get("/reports/resource-utilization/", { params });
  return response.data;
}

export async function getProjectOverrun(): Promise<ProjectOverrunReport> {
  const response = await api.get("/reports/project-overrun/");
  return response.data;
}
