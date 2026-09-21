import api from "./api";
import type { User } from "../types";

export async function login(username: string, password: string) {
  const response = await api.post("/token/", { username, password });
  localStorage.setItem("access_token", response.data.access);
  localStorage.setItem("refresh_token", response.data.refresh);
  return response.data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export async function getMe(): Promise<User> {
  const response = await api.get("/me/");
  return response.data;
}
