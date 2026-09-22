import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  KanbanSquare,
  Clock,
  BarChart3,
  Users2,
  Building2,
  Building,
  Target,
  Briefcase,
  Handshake,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

type NavLinkDef = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };

const baseLinks: NavLinkDef[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
];

const deliveryLinks: NavLinkDef[] = [
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/kanban", label: "Kanban", icon: KanbanSquare },
  { to: "/timesheet", label: "Timesheet", icon: Clock },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isGlobalAdmin = user?.role === "GLOBAL_ADMIN";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isAdmin = user?.role === "ADMIN";
  const isSalesManager = user?.role === "SALES_MANAGER";
  const isSalesperson = user?.role === "SALESPERSON";
  const canManageUsers = isGlobalAdmin || isSuperAdmin;
  const hasCompanyWideVisibility = isGlobalAdmin || isSuperAdmin || isAdmin;
  const hasSalesAccess = hasCompanyWideVisibility || isSalesManager || isSalesperson;

  const links = [
    ...baseLinks,
    ...(hasSalesAccess
      ? [
          { to: "/clients", label: "Clients", icon: Building },
          { to: "/sales-team", label: "Sales Team", icon: Target },
          { to: "/sales-projects", label: "Sales Projects", icon: Briefcase },
          { to: "/deals", label: "Deals", icon: Handshake },
        ]
      : []),
    ...deliveryLinks,
    ...(hasCompanyWideVisibility ? [{ to: "/reports", label: "Reports", icon: BarChart3 }] : []),
    ...(canManageUsers
      ? [{ to: "/users", label: isGlobalAdmin ? "All Users" : "Team", icon: Users2 }]
      : []),
    ...(isGlobalAdmin ? [{ to: "/companies", label: "Companies", icon: Building2 }] : []),
  ];

  return (
    <aside className="w-56 border-r border-gray-200 bg-white p-4 flex flex-col gap-1">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `nav-tab flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
              isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:text-gray-900"
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
