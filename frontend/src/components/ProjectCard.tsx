import { Link } from "react-router-dom";

import type { Project } from "../types";

const statusColors: Record<Project["status"], string> = {
  PLANNING: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const priorityColors: Record<Project["priority"], string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

function formatBudget(budget: string | null) {
  if (!budget) return null;
  const value = Number(budget);
  if (Number.isNaN(value)) return null;
  return value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function ProjectCard({ project }: { project: Project }) {
  const location = [project.region, project.state].filter(Boolean).join(", ");
  const budget = formatBudget(project.budget);

  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3 className="font-semibold text-gray-800">{project.name}</h3>
        <div className="flex gap-1 flex-none">
          <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[project.priority]}`}>
            {project.priority}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${statusColors[project.status]}`}>
            {project.status.replace("_", " ")}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-2">{project.code}</p>
      <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>

      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
        <p className="text-xs text-gray-400">Owner: {project.owner_name}</p>
        {project.pmo_name && <p className="text-xs text-gray-400">PMO: {project.pmo_name}</p>}
        {location && <p className="text-xs text-gray-400">Location: {location}</p>}
        {budget && <p className="text-xs text-gray-400">Budget: {budget}</p>}
      </div>
    </Link>
  );
}
