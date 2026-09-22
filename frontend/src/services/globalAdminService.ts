import api from "./api";
import type { GlobalAdminStats, PlatformSettingsData } from "../types";

export async function getGlobalAdminStats(): Promise<GlobalAdminStats> {
  const response = await api.get("/global-admin/stats/");
  return response.data;
}

export async function getPlatformSettings(): Promise<PlatformSettingsData> {
  const response = await api.get("/platform-settings/");
  return response.data;
}

export async function updatePlatformSettings(
  data: Partial<PlatformSettingsData>
): Promise<PlatformSettingsData> {
  const response = await api.patch("/platform-settings/", data);
  return response.data;
}
