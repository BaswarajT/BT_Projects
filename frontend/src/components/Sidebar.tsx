import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  KanbanSquare,
  Flag,
  Clock,
  BarChart3,
  Users2,
  Building2,
  Building,
  Target,
  Handshake,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

type NavLinkDef = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };
type NavGroup = { key: string; links: NavLinkDef[] };

function NavGroupBlock({ group, isFirst }: { group: NavGroup; isFirst: boolean }) {
  return (
    <div className={`flex flex-col gap-1 ${isFirst ? "" : "mt-3 pt-3 border-t border-gray-100"}`}>
      {group.links.map(({ to, label, icon: Icon, end }) => (
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
    </div>
  );
}

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

  const groups: NavGroup[] = [
    { key: "dashboard", links: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }] },
    {
      key: "delivery",
      links: [
        { to: "/projects", label: "Projects", icon: FolderKanban },
        { to: "/milestones", label: "Milestones", icon: Flag },
        { to: "/tasks", label: "Tasks", icon: ListChecks },
        { to: "/timesheet", label: "Timesheet", icon: Clock },
        { to: "/kanban", label: "Kanban", icon: KanbanSquare },
      ],
    },
    ...(hasSalesAccess
      ? [
          {
            key: "sales",
            links: [
              { to: "/clients", label: "Clients", icon: Building },
              { to: "/sales-team", label: "Sales Team", icon: Target },
              { to: "/deals", label: "Deals Projects", icon: Handshake },
            ],
          },
        ]
      : []),
    ...(hasCompanyWideVisibility || canManageUsers
      ? [
          {
            key: "reports",
            links: [
              ...(hasCompanyWideVisibility ? [{ to: "/reports", label: "Reports", icon: BarChart3 }] : []),
              ...(canManageUsers
                ? [{ to: "/users", label: isGlobalAdmin ? "All Users" : "Team", icon: Users2 }]
                : []),
            ],
          },
        ]
      : []),
    ...(isGlobalAdmin
      ? [
          {
            key: "global-admin",
            links: [
              { to: "/global-admin", label: "Global Admin", icon: ShieldCheck },
              { to: "/companies", label: "Companies", icon: Building2 },
            ],
          },
        ]
      : []),
  ];

  return (
    <aside className="w-56 border-r border-gray-200 bg-white p-4 flex flex-col">
      {groups.map((group, i) => (
        <NavGroupBlock key={group.key} group={group} isFirst={i === 0} />
      ))}
    </aside>
  );
}
