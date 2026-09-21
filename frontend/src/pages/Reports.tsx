import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Gauge, Users2 } from "lucide-react";

import { getProjectOverrun, getResourceUtilization } from "../services/reportService";
import {
  SCHEDULE_LABELS,
  UTILIZATION_LABELS,
  type ScheduleStatus,
  type UtilizationStatus,
} from "../types";

type Tab = "utilization" | "overrun";

const utilizationBadge: Record<UtilizationStatus, string> = {
  BENCH: "bg-gray-100 text-gray-600",
  UNDER_UTILIZED: "bg-yellow-100 text-yellow-700",
  UTILIZED: "bg-green-100 text-green-700",
  OVER_ALLOCATED: "bg-red-100 text-red-700",
};

const utilizationBar: Record<UtilizationStatus, string> = {
  BENCH: "bg-gray-300",
  UNDER_UTILIZED: "bg-yellow-500",
  UTILIZED: "bg-green-500",
  OVER_ALLOCATED: "bg-red-500",
};

const scheduleBadge: Record<ScheduleStatus, string> = {
  ON_TRACK: "bg-green-100 text-green-700",
  OVER_BUDGET: "bg-orange-100 text-orange-700",
  OVERDUE: "bg-red-100 text-red-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

const scheduleBar: Record<ScheduleStatus, string> = {
  ON_TRACK: "bg-green-500",
  OVER_BUDGET: "bg-orange-500",
  OVERDUE: "bg-red-500",
  COMPLETED: "bg-blue-500",
  CANCELLED: "bg-gray-400",
};

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Reports() {
  const [tab, setTab] = useState<Tab>("utilization");
  const [dateFrom, setDateFrom] = useState(startOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const utilizationQuery = useQuery({
    queryKey: ["report-utilization", { dateFrom, dateTo }],
    queryFn: () => getResourceUtilization({ start_date: dateFrom, end_date: dateTo }),
    enabled: tab === "utilization",
  });

  const overrunQuery = useQuery({
    queryKey: ["report-overrun"],
    queryFn: getProjectOverrun,
    enabled: tab === "overrun",
  });

  const resources = utilizationQuery.data?.resources ?? [];
  const avgUtilization = resources.length
    ? Math.round(resources.reduce((sum, r) => sum + r.utilization_pct, 0) / resources.length)
    : 0;
  const overAllocatedCount = resources.filter((r) => r.status === "OVER_ALLOCATED").length;

  const projects = overrunQuery.data?.projects ?? [];
  const overBudgetCount = projects.filter((p) => p.schedule_status === "OVER_BUDGET").length;
  const overdueCount = projects.filter((p) => p.schedule_status === "OVERDUE").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Reports</h1>
        <p className="text-sm text-gray-500">Resource utilization, bench availability, and project overrun.</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("utilization")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "utilization"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users2 size={16} /> Resource Utilization
        </button>
        <button
          onClick={() => setTab("overrun")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "overrun"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <BarChart3 size={16} /> Project Overrun
        </button>
      </div>

      {tab === "utilization" && (
        <div>
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div>
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input
                type="date"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input
                type="date"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Resources</p>
              <p className="text-2xl font-semibold text-gray-800">{resources.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">On Bench</p>
              <p className="text-2xl font-semibold text-gray-800">{utilizationQuery.data?.bench_count ?? 0}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Avg Utilization</p>
              <p className="text-2xl font-semibold text-gray-800">{avgUtilization}%</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Over-allocated</p>
              <p className="text-2xl font-semibold text-gray-800">{overAllocatedCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Resource</th>
                  <th className="px-4 py-2">Capacity</th>
                  <th className="px-4 py-2 w-48">Utilization</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Active Tasks</th>
                  <th className="px-4 py-2">Available From</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resources.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-800">{r.full_name}</p>
                      <p className="text-xs text-gray-400">@{r.username}</p>
                    </td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {r.logged_hours.toFixed(1)} / {r.capacity_hours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${utilizationBar[r.status]}`}
                            style={{ width: `${Math.min(r.utilization_pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{r.utilization_pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${utilizationBadge[r.status]}`}>
                        {UTILIZATION_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{r.active_assignments}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {r.available_from ? r.available_from : "Available now"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {utilizationQuery.isLoading && <p className="text-sm text-gray-500 px-4 py-4">Loading...</p>}
            {!utilizationQuery.isLoading && resources.length === 0 && (
              <p className="text-sm text-gray-400 px-4 py-4">No delivery resources found for this period.</p>
            )}
          </div>
        </div>
      )}

      {tab === "overrun" && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Projects</p>
              <p className="text-2xl font-semibold text-gray-800">{projects.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Over Budget</p>
              <p className="text-2xl font-semibold text-gray-800">{overBudgetCount}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Overdue</p>
              <p className="text-2xl font-semibold text-gray-800">{overdueCount}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2">Project</th>
                  <th className="px-4 py-2">Est. vs Actual</th>
                  <th className="px-4 py-2 w-48">Hours Used</th>
                  <th className="px-4 py-2">Overrun</th>
                  <th className="px-4 py-2">Schedule</th>
                  <th className="px-4 py-2">End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2">
                      <p className="font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.code}</p>
                    </td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                      {p.actual_hours.toFixed(1)} / {p.estimated_hours.toFixed(1)}h
                    </td>
                    <td className="px-4 py-2">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scheduleBar[p.schedule_status]}`}
                          style={{
                            width: `${
                              p.estimated_hours > 0
                                ? Math.min((p.actual_hours / p.estimated_hours) * 100, 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {p.overrun_pct > 0 ? `+${p.overrun_pct}%` : `${p.overrun_pct}%`}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${scheduleBadge[p.schedule_status]}`}>
                        {SCHEDULE_LABELS[p.schedule_status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-700 whitespace-nowrap">{p.end_date ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {overrunQuery.isLoading && <p className="text-sm text-gray-500 px-4 py-4">Loading...</p>}
            {!overrunQuery.isLoading && projects.length === 0 && (
              <p className="text-sm text-gray-400 px-4 py-4">No projects found.</p>
            )}
          </div>

          {overrunQuery.data && (
            <p className="mt-3 text-xs text-gray-400 flex items-center gap-1">
              <Gauge size={12} /> Actual hours are derived from logged timesheet entries.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
