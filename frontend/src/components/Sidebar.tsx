import { useEffect, useRef, useState } from "react";
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
import { updateSidebarOrder } from "../services/profileService";

type NavLinkDef = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean };
type NavGroup = { key: string; links: NavLinkDef[] };

// Hold a tab down this long, without moving, to pick it up and drag it to a
// new spot within its own section. Releasing early is just a normal click.
const HOLD_MS = 5000;
const MOVE_CANCEL_PX = 8;

function flatten(groups: NavGroup[]): string[] {
  return groups.flatMap((g) => g.links.map((l) => l.to));
}

function orderGroups(groups: NavGroup[], order: string[] | null): NavGroup[] {
  if (!order || order.length === 0) return groups;
  const rank = new Map(order.map((to, i) => [to, i]));
  return groups.map((g) => ({
    ...g,
    links: [...g.links].sort((a, b) => {
      const ra = rank.has(a.to) ? rank.get(a.to)! : Number.MAX_SAFE_INTEGER;
      const rb = rank.has(b.to) ? rank.get(b.to)! : Number.MAX_SAFE_INTEGER;
      return ra - rb;
    }),
  }));
}

export default function Sidebar() {
  const { user, refreshUser } = useAuth();
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

  const [customOrder, setCustomOrder] = useState<string[] | null>(null);
  const [holdingKey, setHoldingKey] = useState<string | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);

  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const holdTimerRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef<string | null>(null);
  const workingOrderRef = useRef<string[]>([]);

  useEffect(() => {
    setCustomOrder(user?.sidebar_order ?? null);
  }, [user?.id, user?.sidebar_order]);

  const orderedGroups = orderGroups(groups, customOrder);

  function beginDrag(groupKey: string, key: string) {
    const base = customOrder && customOrder.length > 0 ? customOrder : flatten(groups);
    const groupLinkKeys = groups.find((g) => g.key === groupKey)?.links.map((l) => l.to) ?? [];
    const working = [...base];
    for (const k of groupLinkKeys) {
      if (!working.includes(k)) working.push(k);
    }
    workingOrderRef.current = working;
    suppressClickRef.current = key;
    setDragKey(key);

    function onMove(e: PointerEvent) {
      let closestKey = key;
      let closestDist = Infinity;
      for (const k of groupLinkKeys) {
        const el = rowRefs.current[k];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - midY);
        if (dist < closestDist) {
          closestDist = dist;
          closestKey = k;
        }
      }
      if (closestKey === key) return;

      const order = workingOrderRef.current;
      const subsequence = order.filter((k) => groupLinkKeys.includes(k));
      const fromIdx = subsequence.indexOf(key);
      const toIdx = subsequence.indexOf(closestKey);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
      subsequence.splice(fromIdx, 1);
      subsequence.splice(toIdx, 0, key);

      let cursor = 0;
      const newOrder = order.map((k) => (groupLinkKeys.includes(k) ? subsequence[cursor++] : k));
      workingOrderRef.current = newOrder;
      setCustomOrder(newOrder);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragKey(null);
      const finalOrder = workingOrderRef.current;
      updateSidebarOrder(finalOrder)
        .then(() => refreshUser())
        .catch(() => {});
      window.setTimeout(() => {
        suppressClickRef.current = null;
      }, 0);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handlePointerDown(e: React.PointerEvent, groupKey: string, key: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setHoldingKey(key);

    function cancelHold() {
      if (holdTimerRef.current) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      setHoldingKey(null);
      window.removeEventListener("pointermove", onEarlyMove);
      window.removeEventListener("pointerup", onEarlyUp);
    }
    function onEarlyMove(ev: PointerEvent) {
      if (!startPosRef.current) return;
      const dx = Math.abs(ev.clientX - startPosRef.current.x);
      const dy = Math.abs(ev.clientY - startPosRef.current.y);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) cancelHold();
    }
    function onEarlyUp() {
      cancelHold();
    }

    window.addEventListener("pointermove", onEarlyMove);
    window.addEventListener("pointerup", onEarlyUp);

    holdTimerRef.current = window.setTimeout(() => {
      window.removeEventListener("pointermove", onEarlyMove);
      window.removeEventListener("pointerup", onEarlyUp);
      setHoldingKey(null);
      beginDrag(groupKey, key);
    }, HOLD_MS);
  }

  function handleLinkClick(e: React.MouseEvent, key: string) {
    if (suppressClickRef.current === key) {
      e.preventDefault();
      suppressClickRef.current = null;
    }
  }

  return (
    <aside className="w-56 border-r border-gray-200 bg-white p-4 flex flex-col">
      {orderedGroups.map((group, i) => (
        <div key={group.key} className={`flex flex-col gap-1 ${i === 0 ? "" : "mt-3 pt-3 border-t border-gray-100"}`}>
          {group.links.map((link) => (
            <div
              key={link.to}
              ref={(el) => {
                rowRefs.current[link.to] = el;
              }}
              className="relative"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => handlePointerDown(e, group.key, link.to)}
            >
              <NavLink
                to={link.to}
                end={link.end}
                onClick={(e) => handleLinkClick(e, link.to)}
                className={({ isActive }) =>
                  `nav-tab flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium select-none ${
                    isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:text-gray-900"
                  } ${dragKey === link.to ? "nav-tab-grabbed" : ""}`
                }
              >
                <link.icon size={18} />
                {link.label}
              </NavLink>
              {holdingKey === link.to && (
                <span className="nav-tab-hold-bar absolute left-0 bottom-0 h-0.5 w-full bg-indigo-500 origin-left rounded-full" />
              )}
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}
