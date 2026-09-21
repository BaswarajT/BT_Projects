import { NavLink } from "react-router-dom";
import { LayoutDashboard, FolderKanban, ListChecks, KanbanSquare, Users2, Building2 } from "lucide-react";

import { useAuth } from "../context/AuthContext";

const baseLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/kanban", label: "Kanban", icon: KanbanSquare },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdminOrAbove = isSuperAdmin || user?.role === "ADMIN";

  const links = [
    ...baseLinks,
    ...(isAdminOrAbove ? [{ to: "/users", label: isSuperAdmin ? "All Users" : "Team", icon: Users2 }] : []),
    ...(isSuperAdmin ? [{ to: "/companies", label: "Companies", icon: Building2 }] : []),
  ];

  return (
    <aside className="w-56 border-r border-gray-200 bg-white p-4 flex flex-col gap-1">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
              isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
