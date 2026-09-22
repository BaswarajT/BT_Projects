import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
} from "lucide-react";

import Modal from "../components/Modal";
import { getClients } from "../services/clientService";
import {
  createProject,
  deleteProject,
  exportProjects,
  getProjects,
  getRecycleBinProjects,
  restoreProject,
  updateProject,
} from "../services/projectService";
import { getTeamDirectory } from "../services/teamDirectoryService";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  type Project,
  type ProjectPriority,
  type ProjectStatus,
  type ProjectTypeTag,
} from "../types";

const COLUMN_VISIBILITY_KEY = "projects.visibleColumns";

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  render: (p: Project) => ReactNode;
}

const statusTones: Record<ProjectStatus, string> = {
  PLANNING: "bg-gray-100 text-gray-600",
  ACTIVE: "bg-green-100 text-green-700",
  ON_HOLD: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function money(value: string | null): string {
  if (value === null || value === "") return "—";
  return Number(value).toLocaleString();
}

const columns: ColumnDef[] = [
  { key: "code", label: "Project Id", defaultVisible: true, render: (p) => p.code },
  {
    key: "name", label: "Project Name", defaultVisible: true,
    render: (p) => <Link to={`/projects/${p.id}`} className="text-indigo-700 hover:underline">{p.name}</Link>,
  },
  {
    key: "percent_complete", label: "% Completed", defaultVisible: true,
    render: (p) => (
      <div className="flex items-center gap-2 w-28">
        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${p.percent_complete}%` }} />
        </div>
        <span className="text-xs text-gray-500 w-8 text-right">{p.percent_complete}%</span>
      </div>
    ),
  },
  {
    key: "status", label: "Status", defaultVisible: true,
    render: (p) => (
      <span className={`text-xs px-2 py-1 rounded-full ${statusTones[p.status]}`}>
        {PROJECT_STATUS_LABELS[p.status]}
      </span>
    ),
  },
  { key: "owner_name", label: "Owner", defaultVisible: true, render: (p) => p.owner_name },
  { key: "pmo_owner_name", label: "PMO Owner", defaultVisible: true, render: (p) => p.pmo_owner_name || "—" },
  { key: "project_group", label: "Project Group", defaultVisible: true, render: (p) => p.project_group || "—" },
  { key: "created_by_name", label: "Created By", defaultVisible: false, render: (p) => p.created_by_name || "—" },
  { key: "start_date", label: "Start Date", defaultVisible: true, render: (p) => p.start_date || "—" },
  { key: "end_date", label: "End Date", defaultVisible: true, render: (p) => p.end_date || "—" },
  { key: "completion_date", label: "Completion Time", defaultVisible: false, render: (p) => p.completion_date || "—" },
  { key: "unique_order_id", label: "Unique Order Id", defaultVisible: false, render: (p) => p.unique_order_id || "—" },
  { key: "po_status", label: "PO Status", defaultVisible: false, render: (p) => p.po_status || "—" },
  { key: "po_number", label: "PO No.", defaultVisible: false, render: (p) => p.po_number || "—" },
  { key: "currency", label: "Currency", defaultVisible: false, render: (p) => p.currency || "—" },
  { key: "po_value", label: "PO Value", defaultVisible: true, render: (p) => money(p.po_value) },
  { key: "man_days", label: "Project Man Days", defaultVisible: false, render: (p) => p.man_days ?? "—" },
  { key: "sales_person_name", label: "Sales Person Name", defaultVisible: false, render: (p) => p.sales_person_name || "—" },
  { key: "region", label: "Sales Region", defaultVisible: false, render: (p) => p.region || "—" },
  { key: "client_name", label: "Client Name", defaultVisible: true, render: (p) => p.client_name || "—" },
  { key: "category_a", label: "Project Category-A", defaultVisible: false, render: (p) => p.category_a || "—" },
  { key: "category_b", label: "Project Category-B", defaultVisible: false, render: (p) => p.category_b || "—" },
  { key: "contract_type", label: "Contract Type", defaultVisible: false, render: (p) => p.contract_type || "—" },
  { key: "comments", label: "Comments", defaultVisible: false, render: (p) => p.comments || "—" },
  { key: "project_comments", label: "Project Comments", defaultVisible: false, render: (p) => p.project_comments || "—" },
  { key: "overrun_comments", label: "Overrun Comments", defaultVisible: false, render: (p) => p.overrun_comments || "—" },
  { key: "po_date", label: "PO Date", defaultVisible: false, render: (p) => p.po_date || "—" },
  { key: "billing_entity", label: "Billing Entity", defaultVisible: false, render: (p) => p.billing_entity || "—" },
  { key: "budget_type", label: "Budget Type", defaultVisible: false, render: (p) => p.budget_type || "—" },
  { key: "working_emp", label: "Working Emp", defaultVisible: false, render: (p) => p.working_emp || "—" },
  {
    key: "created_at", label: "Created Time", defaultVisible: false,
    render: (p) => new Date(p.created_at).toLocaleString(),
  },
  { key: "lob_head_name", label: "Lob Head", defaultVisible: false, render: (p) => p.lob_head_name || "—" },
  { key: "delivery_leads", label: "Delivery Leads", defaultVisible: false, render: (p) => p.delivery_leads || "—" },
  { key: "project_type", label: "Project Type", defaultVisible: false, render: (p) => PROJECT_TYPE_LABELS[p.project_type] },
  {
    key: "completion_status", label: "Project Completion Status", defaultVisible: false,
    render: (p) => (p.completion_status ? PROJECT_STATUS_LABELS[p.completion_status] : "—"),
  },
];

function loadVisibleColumns(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore corrupted/unavailable localStorage, fall through to defaults
  }
  return Object.fromEntries(columns.map((c) => [c.key, c.defaultVisible]));
}

const priorities: ProjectPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const statuses: ProjectStatus[] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];
const projectTypes: ProjectTypeTag[] = ["MRA", "NON_MRA"];

interface ProjectForm {
  name: string; description: string;
  status: ProjectStatus; completion_status: ProjectStatus | ""; priority: ProjectPriority;
  percent_complete: number; project_type: ProjectTypeTag;
  pmo: number | ""; sales_person: number | ""; lob_head: number | ""; delivery_leads: string;
  client: number | ""; project_group: string; category_a: string; category_b: string;
  contract_type: string; billing_entity: string; budget_type: string;
  currency: string; po_value: string; budget: string; man_days: string;
  po_status: string; po_number: string; unique_order_id: string; po_date: string;
  region: string; state: string; start_date: string; end_date: string; completion_date: string;
  comments: string; project_comments: string; overrun_comments: string;
}

function emptyForm(): ProjectForm {
  return {
    name: "", description: "",
    status: "PLANNING", completion_status: "", priority: "MEDIUM",
    percent_complete: 0, project_type: "",
    pmo: "", sales_person: "", lob_head: "", delivery_leads: "",
    client: "", project_group: "", category_a: "", category_b: "",
    contract_type: "", billing_entity: "", budget_type: "",
    currency: "", po_value: "", budget: "", man_days: "",
    po_status: "", po_number: "", unique_order_id: "", po_date: "",
    region: "", state: "", start_date: "", end_date: "", completion_date: "",
    comments: "", project_comments: "", overrun_comments: "",
  };
}

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

type View = "active" | "recycle";

export default function Projects() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("active");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectTypeFilter, setProjectTypeFilter] = useState("");
  const [pmoFilter, setPmoFilter] = useState("");
  const [lobFilter, setLobFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [startDateFrom, setStartDateFrom] = useState("");
  const [startDateTo, setStartDateTo] = useState("");

  const filterParams = {
    ...(search ? { search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(projectTypeFilter ? { project_type: projectTypeFilter } : {}),
    ...(pmoFilter ? { pmo: pmoFilter } : {}),
    ...(lobFilter ? { lob: lobFilter } : {}),
    ...(clientFilter ? { client: clientFilter } : {}),
    ...(startDateFrom ? { start_date_from: startDateFrom } : {}),
    ...(startDateTo ? { start_date_to: startDateTo } : {}),
  };

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", filterParams],
    queryFn: () => getProjects(filterParams),
    enabled: view === "active",
  });
  const { data: deletedProjects, isLoading: isLoadingRecycleBin } = useQuery({
    queryKey: ["recycle-bin-projects", search],
    queryFn: () => getRecycleBinProjects(search ? { search } : undefined),
    enabled: view === "recycle",
  });
  const { data: team } = useQuery({ queryKey: ["team-directory"], queryFn: getTeamDirectory });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => getClients() });

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(loadVisibleColumns);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(visibleColumns));
    } catch {
      // per-viewer convenience only; ignore if storage is unavailable
    }
  }, [visibleColumns]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shownColumns = useMemo(() => columns.filter((c) => visibleColumns[c.key] !== false), [visibleColumns]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["recycle-bin-projects"] });
  }

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (error) => setFormError(formatApiError(error)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) => updateProject(id, data),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (error) => setFormError(formatApiError(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: invalidate,
  });
  const restoreMutation = useMutation({
    mutationFn: restoreProject,
    onSuccess: invalidate,
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description,
      status: p.status, completion_status: p.completion_status, priority: p.priority,
      percent_complete: p.percent_complete, project_type: p.project_type,
      pmo: p.pmo ?? "", sales_person: p.sales_person ?? "", lob_head: p.lob_head ?? "",
      delivery_leads: p.delivery_leads,
      client: p.client ?? "", project_group: p.project_group, category_a: p.category_a,
      category_b: p.category_b, contract_type: p.contract_type, billing_entity: p.billing_entity,
      budget_type: p.budget_type,
      currency: p.currency, po_value: p.po_value ?? "", budget: p.budget ?? "", man_days: p.man_days?.toString() ?? "",
      po_status: p.po_status, po_number: p.po_number, unique_order_id: p.unique_order_id, po_date: p.po_date ?? "",
      region: p.region, state: p.state, start_date: p.start_date ?? "", end_date: p.end_date ?? "",
      completion_date: p.completion_date ?? "",
      comments: p.comments, project_comments: p.project_comments, overrun_comments: p.overrun_comments,
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditing(null);
    setFormError(null);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const payload: Record<string, unknown> = {
      ...form,
      pmo: form.pmo || null,
      sales_person: form.sales_person || null,
      lob_head: form.lob_head || null,
      client: form.client || null,
      completion_status: form.completion_status || "",
      po_value: form.po_value || null,
      budget: form.budget || null,
      man_days: form.man_days || null,
      po_date: form.po_date || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      completion_date: form.completion_date || null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(id: number, name: string) {
    if (!window.confirm(`Move "${name}" to the Recycle Bin? You can restore it later.`)) return;
    deleteMutation.mutate(id);
  }

  async function handleExport(filetype: "csv" | "xlsx") {
    setIsExporting(true);
    setExportError(null);
    try {
      await exportProjects(filetype, filterParams);
      setIsSettingsOpen(false);
    } catch {
      setExportError("Could not export projects. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Projects</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreate}
            className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
          >
            <Plus size={16} /> New Project
          </button>
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen((v) => !v)}
              title="Columns & export"
              className="flex items-center gap-1 border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded-md hover:bg-gray-50"
            >
              <Settings size={16} />
            </button>
            {isSettingsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg border border-gray-200 shadow-lg z-20 max-h-[70vh] overflow-y-auto">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Export</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport("csv")}
                      disabled={isExporting}
                      className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FileText size={13} /> CSV
                    </button>
                    <button
                      onClick={() => handleExport("xlsx")}
                      disabled={isExporting}
                      className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <FileSpreadsheet size={13} /> Excel
                    </button>
                  </div>
                  {exportError && <p className="text-xs text-red-600 mt-2">{exportError}</p>}
                  <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                    <Download size={11} /> Exports respect the current filters below.
                  </p>
                </div>
                <div className="p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Columns</p>
                  <div className="space-y-1.5">
                    {columns.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={visibleColumns[c.key] !== false}
                          onChange={(e) => setVisibleColumns({ ...visibleColumns, [c.key]: e.target.checked })}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setView("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            view === "active"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Active{projects ? ` (${projects.length})` : ""}
        </button>
        <button
          onClick={() => setView("recycle")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            view === "recycle"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Recycle Bin{deletedProjects ? ` (${deletedProjects.length})` : ""}
        </button>
      </div>

      {view === "active" && <>
      <div className="flex flex-wrap items-end gap-3 mb-6 bg-white border border-gray-200 rounded-lg p-3">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search projects..."
            className="w-56 rounded-md border border-gray-300 pl-8 pr-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Status</label>
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Project Type</label>
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={projectTypeFilter}
            onChange={(e) => setProjectTypeFilter(e.target.value)}
          >
            <option value="">All</option>
            {projectTypes.map((t) => (
              <option key={t} value={t}>{PROJECT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">PMO</label>
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={pmoFilter}
            onChange={(e) => setPmoFilter(e.target.value)}
          >
            <option value="">All</option>
            {team?.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">LOB / Project Group</label>
          <input
            placeholder="e.g. GRC, MDR"
            className="w-36 rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={lobFilter}
            onChange={(e) => setLobFilter(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Client</label>
          <select
            className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="">All</option>
            {clients?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Start From</label>
          <input
            type="date"
            className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={startDateFrom}
            onChange={(e) => setStartDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Start To</label>
          <input
            type="date"
            className="rounded-md border border-gray-300 px-2 py-2 text-sm"
            value={startDateTo}
            onChange={(e) => setStartDateTo(e.target.value)}
          />
        </div>
        {(search || statusFilter || projectTypeFilter || pmoFilter || lobFilter || clientFilter || startDateFrom || startDateTo) && (
          <button
            onClick={() => {
              setSearch(""); setStatusFilter(""); setProjectTypeFilter(""); setPmoFilter("");
              setLobFilter(""); setClientFilter(""); setStartDateFrom(""); setStartDateTo("");
            }}
            className="text-xs text-gray-500 hover:text-red-600 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading projects...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                {shownColumns.map((c) => (
                  <th key={c.key} className="px-4 py-3 whitespace-nowrap">{c.label}</th>
                ))}
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projects?.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  {shownColumns.map((c) => (
                    <td
                      key={c.key}
                      className="px-4 py-3 text-gray-700 whitespace-nowrap cursor-pointer"
                      onClick={() => openEdit(p)}
                    >
                      {c.render(p)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      title="Delete project"
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects?.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6 text-center">No projects match these filters.</p>
          )}
        </div>
      )}
      </>}

      {view === "recycle" && (isLoadingRecycleBin ? (
        <p className="text-sm text-gray-500">Loading recycle bin...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Project Id</th>
                <th className="px-4 py-3">Project Name</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Deleted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deletedProjects?.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-gray-700">{p.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.client_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{p.owner_name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.deleted_at ? new Date(p.deleted_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => restoreMutation.mutate(p.id)}
                      disabled={restoreMutation.isPending}
                      title="Restore"
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
                    >
                      <RotateCcw size={13} /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deletedProjects?.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6 text-center">Recycle bin is empty.</p>
          )}
        </div>
      ))}

      {isModalOpen && (
        <Modal title={editing ? "Edit Project" : "New Project"} onClose={closeModal} wide>
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Basic</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Id</label>
                  <input
                    disabled
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                    value={editing ? editing.code : "Auto-generated on save"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">% Completed</label>
                  <input
                    type="number" min="0" max="100"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.percent_complete}
                    onChange={(e) => setForm({ ...form, percent_complete: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Completion Status</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.completion_status}
                    onChange={(e) => setForm({ ...form, completion_status: e.target.value as ProjectStatus | "" })}
                  >
                    <option value="">—</option>
                    {statuses.map((s) => (
                      <option key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value as ProjectPriority })}
                  >
                    {priorities.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Type</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.project_type}
                    onChange={(e) => setForm({ ...form, project_type: e.target.value as ProjectTypeTag })}
                  >
                    <option value="">—</option>
                    {projectTypes.map((t) => (
                      <option key={t} value={t}>{PROJECT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Ownership &amp; Assignment</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PMO Owner</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.pmo}
                    onChange={(e) => setForm({ ...form, pmo: e.target.value ? Number(e.target.value) : "" })}
                  >
                    <option value="">—</option>
                    {team?.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person Name</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.sales_person}
                    onChange={(e) => setForm({ ...form, sales_person: e.target.value ? Number(e.target.value) : "" })}
                  >
                    <option value="">—</option>
                    {team?.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lob Head</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.lob_head}
                    onChange={(e) => setForm({ ...form, lob_head: e.target.value ? Number(e.target.value) : "" })}
                  >
                    <option value="">—</option>
                    {team?.map((m) => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Leads</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.delivery_leads}
                    onChange={(e) => setForm({ ...form, delivery_leads: e.target.value })}
                    placeholder="Comma-separated names"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Classification</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.client}
                    onChange={(e) => setForm({ ...form, client: e.target.value ? Number(e.target.value) : "" })}
                  >
                    <option value="">—</option>
                    {clients?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Group</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.project_group}
                    onChange={(e) => setForm({ ...form, project_group: e.target.value })}
                    placeholder="e.g. GRC - KSA"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Category-A</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.category_a}
                    onChange={(e) => setForm({ ...form, category_a: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Category-B</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.category_b}
                    onChange={(e) => setForm({ ...form, category_b: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Type</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.contract_type}
                    onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Entity</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.billing_entity}
                    onChange={(e) => setForm({ ...form, billing_entity: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Type</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.budget_type}
                    onChange={(e) => setForm({ ...form, budget_type: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sales Region</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.region}
                    onChange={(e) => setForm({ ...form, region: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Financial &amp; PO</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    placeholder="INR / USD / SAR / AED"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO Value</label>
                  <input
                    type="number" step="0.01"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.po_value}
                    onChange={(e) => setForm({ ...form, po_value: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                  <input
                    type="number" step="0.01"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Man Days</label>
                  <input
                    type="number"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.man_days}
                    onChange={(e) => setForm({ ...form, man_days: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO Status</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.po_status}
                    onChange={(e) => setForm({ ...form, po_status: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO No.</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.po_number}
                    onChange={(e) => setForm({ ...form, po_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unique Order Id</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.unique_order_id}
                    onChange={(e) => setForm({ ...form, unique_order_id: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO Date</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.po_date}
                    onChange={(e) => setForm({ ...form, po_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Timeline</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Completion Time</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.completion_date}
                    onChange={(e) => setForm({ ...form, completion_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Comments</p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    value={form.comments}
                    onChange={(e) => setForm({ ...form, comments: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Comments</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    value={form.project_comments}
                    onChange={(e) => setForm({ ...form, project_comments: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overrun Comments</label>
                  <textarea
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    value={form.overrun_comments}
                    onChange={(e) => setForm({ ...form, overrun_comments: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : editing ? "Save changes" : "Create project"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
