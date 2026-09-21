import api from "./api";
import type { User } from "../types";

export type VerificationPurpose = "email" | "phone";

export async function updateProfile(data: FormData): Promise<User> {
  const response = await api.patch("/me/", data);
  return response.data;
}

export async function requestOtp(purpose: VerificationPurpose): Promise<{ detail: string; dev_code?: string }> {
  const response = await api.post(`/verify/${purpose}/request/`);
  return response.data;
}

export async function confirmOtp(purpose: VerificationPurpose, code: string): Promise<User> {
  const response = await api.post(`/verify/${purpose}/confirm/`, { code });
  return response.data;
}
