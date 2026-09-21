import api from "./api";
import type { Company } from "../types";

export async function getCompanies(): Promise<Company[]> {
  const response = await api.get("/companies/");
  return response.data;
}

export async function createCompany(data: { name: string; code: string }): Promise<Company> {
  const response = await api.post("/companies/", data);
  return response.data;
}

export async function updateCompany(id: number, data: Partial<Company>): Promise<Company> {
  const response = await api.patch(`/companies/${id}/`, data);
  return response.data;
}
