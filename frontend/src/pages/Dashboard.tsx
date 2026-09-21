import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CalendarClock, CheckCircle2, FolderKanban, ListTodo, ShieldAlert } from "lucide-react";

import { getDashboardSummary } from "../services/dashboardService";

const statCards = [
  { key: "total_projects", label: "Total Projects", icon: FolderKanban, tone: "text-indigo-600 bg-indigo-50" },
  { key: "open_tasks", label: "Open Tasks", icon: ListTodo, tone: "text-blue-600 bg-blue-50" },
  { key: "completed_tasks", label: "Completed Tasks", icon: CheckCircle2, tone: "text-green-600 bg-green-50" },
  { key: "overdue_tasks", label: "Overdue Tasks", icon: AlertTriangle, tone: "text-red-600 bg-red-50" },
  { key: "blocked_tasks", label: "Blocked Tasks", icon: ShieldAlert, tone: "text-orange-600 bg-orange-50" },
] as const;

const statusColors: Record<string, string> = {
  PLANNING: "bg-gray-400",
  ACTIVE: "bg-green-500",
  ON_HOLD: "bg-yellow-500",
  COMPLETED: "bg-blue-500",
  CANCELLED: "bg-red-500",
};

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const maxWorkload = Math.max(1, ...(data?.team_workload.map((w) => w.open_task_count) ?? [1]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(({ key, label, icon: Icon, tone }) => (
          <div key={key} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className={`inline-flex items-center justify-center w-8 h-8 rounded-md mb-2 ${tone}`}>
              <Icon size={16} />
            </div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-semibold text-gray-800">
              {isLoading ? "-" : data?.[key] ?? 0}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Project Progress</h2>
          {isLoading && <p className="text-sm text-gray-400">Loading...</p>}
          {!isLoading && data?.project_progress.length === 0 && (
            <p className="text-sm text-gray-400">No projects yet.</p>
          )}
          <div className="space-y-4">
            {data?.project_progress.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="block group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusColors[project.status] ?? "bg-gray-400"}`} />
                    <span className="text-sm font-medium text-gray-800 group-hover:text-indigo-600">
                      {project.name}
                    </span>
                    <span className="text-xs text-gray-400">{project.code}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {project.completed_tasks}/{project.total_tasks} tasks
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${project.percent_complete}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CalendarClock size={16} className="text-gray-400" />
            Upcoming Milestones
          </h2>
          {!isLoading && data?.upcoming_milestones.length === 0 && (
            <p className="text-sm text-gray-400">Nothing due soon.</p>
          )}
          <ul className="space-y-3">
            {data?.upcoming_milestones.map((milestone) => (
              <li key={milestone.id} className="text-sm">
                <p className="font-medium text-gray-800">{milestone.title}</p>
                <p className="text-xs text-gray-500">
                  {milestone.project_name} &middot; due {milestone.due_date}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Team Workload</h2>
        {!isLoading && data?.team_workload.length === 0 && (
          <p className="text-sm text-gray-400">No open tasks assigned yet.</p>
        )}
        <div className="space-y-3">
          {data?.team_workload.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <span className="w-24 text-sm text-gray-700 truncate">{member.username}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(member.open_task_count / maxWorkload) * 100}%` }}
                />
              </div>
              <span className="w-6 text-xs text-gray-500 text-right">{member.open_task_count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
