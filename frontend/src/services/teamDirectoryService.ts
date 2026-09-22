import api from "./api";
import type { Role } from "../types";

export interface TeamMember {
  id: number;
  username: string;
  full_name: string;
  role: Role;
}

export async function getTeamDirectory(): Promise<TeamMember[]> {
  const response = await api.get("/team-directory/");
  return response.data;
}
