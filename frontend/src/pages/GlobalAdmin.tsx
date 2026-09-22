import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  Megaphone,
  Settings,
  ShieldAlert,
  TrendingUp,
  Users2,
} from "lucide-react";

import { getGlobalAdminStats, getPlatformSettings, updatePlatformSettings } from "../services/globalAdminService";

type Tab = "overview" | "settings";

function formatApiError(error: unknown): string {
  const data = (error as { response?: { data?: Record<string, string[] | string> } })?.response?.data;
  if (!data) return "Something went wrong. Please try again.";
  return Object.entries(data)
    .map(([field, messages]) => {
      const text = Array.isArray(messages) ? messages.join(" ") : messages;
      return field === "non_field_errors" ? text : `${field}: ${text}`;
    })
    .join(" ");
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-md flex items-center justify-center mb-2 ${tone}`}>
        <Icon size={16} />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-800">{value}</p>
    </div>
  );
}

export default function GlobalAdmin() {
  const [tab, setTab] = useState<Tab>("overview");
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["global-admin-stats"],
    queryFn: getGlobalAdminStats,
    enabled: tab === "overview",
  });

  const { data: platformSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: getPlatformSettings,
    enabled: tab === "settings",
  });

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [announcementBanner, setAnnouncementBanner] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (platformSettings) {
      setMaintenanceMode(platformSettings.maintenance_mode);
      setMaintenanceMessage(platformSettings.maintenance_message);
      setAnnouncementBanner(platformSettings.announcement_banner);
    }
  }, [platformSettings]);

  const saveMutation = useMutation({
    mutationFn: updatePlatformSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["platform-settings"], data);
      queryClient.invalidateQueries({ queryKey: ["platform-settings-public"] });
      setSaveError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (error) => setSaveError(formatApiError(error)),
  });

  function handleSave() {
    saveMutation.mutate({
      maintenance_mode: maintenanceMode,
      maintenance_message: maintenanceMessage,
      announcement_banner: announcementBanner,
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Global Admin</h1>
        <p className="text-sm text-gray-500">Platform-wide controls — visible only to Global Admin.</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("overview")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "overview"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <TrendingUp size={16} /> Overview
        </button>
        <button
          onClick={() => setTab("settings")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "settings"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Settings size={16} /> Settings
        </button>
      </div>

      {tab === "overview" && (
        <div>
          {statsLoading ? (
            <p className="text-sm text-gray-500">Loading platform stats...</p>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Building2} label="Companies" value={stats.total_companies} tone="bg-indigo-50 text-indigo-600" />
                <StatCard icon={Users2} label="Users" value={stats.total_users} tone="bg-blue-50 text-blue-600" />
                <StatCard icon={Briefcase} label="Projects" value={stats.total_projects} tone="bg-cyan-50 text-cyan-600" />
                <StatCard icon={TrendingUp} label="Deals" value={stats.total_deals} tone="bg-violet-50 text-violet-600" />
                <StatCard
                  icon={Building2}
                  label="Active companies"
                  value={stats.active_companies}
                  tone="bg-green-50 text-green-600"
                />
                <StatCard icon={Users2} label="Active users" value={stats.active_users} tone="bg-green-50 text-green-600" />
                <StatCard
                  icon={TrendingUp}
                  label="Open pipeline value"
                  value={stats.open_pipeline_value.toLocaleString()}
                  tone="bg-amber-50 text-amber-600"
                />
                <StatCard
                  icon={TrendingUp}
                  label="New (last 30 days)"
                  value={`${stats.companies_last_30_days} companies · ${stats.users_last_30_days} users`}
                  tone="bg-pink-50 text-pink-600"
                />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">Companies</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2">Company</th>
                      <th className="px-4 py-2">Users</th>
                      <th className="px-4 py-2">Projects</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.companies_by_size.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 text-gray-800">{c.name}</td>
                        <td className="px-4 py-2 text-gray-600">{c.user_count}</td>
                        <td className="px-4 py-2 text-gray-600">{c.project_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === "settings" && (
        <div className="max-w-2xl space-y-6">
          {settingsLoading ? (
            <p className="text-sm text-gray-500">Loading settings...</p>
          ) : (
            <>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <ShieldAlert size={16} className="text-red-500" /> Maintenance mode
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      When on, everyone except Global Admin is blocked from using the app and sees the
                      message below instead.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-checked:bg-red-500 rounded-full transition-colors" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                  </label>
                </div>
                {maintenanceMode && (
                  <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                    <AlertTriangle size={14} className="flex-none mt-0.5" />
                    Every non-Global-Admin user will be locked out immediately after you save this.
                  </div>
                )}
                <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance message</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                />
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-1">
                  <Megaphone size={16} className="text-indigo-500" /> Announcement banner
                </h2>
                <p className="text-xs text-gray-500 mb-3">
                  Shown at the top of the app for every user, every company. Leave blank to hide it.
                </p>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. Scheduled maintenance this Sunday 2–4 AM IST"
                  value={announcementBanner}
                  onChange={(e) => setAnnouncementBanner(e.target.value)}
                />
              </div>

              {saveError && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {saveError}
                </div>
              )}
              {saved && <p className="text-sm text-green-600">Saved.</p>}

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : "Save settings"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
