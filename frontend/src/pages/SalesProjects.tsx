import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightCircle, Briefcase, Plus, Search } from "lucide-react";

import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { getClients } from "../services/clientService";
import {
  convertToProject,
  createSalesProject,
  getSalesProjects,
  updateSalesProject,
} from "../services/salesService";
import { getTeamDirectory } from "../services/teamDirectoryService";
import { DEAL_STAGE_LABELS, type DealStage, type ProjectPriority, type SalesProject } from "../types";

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

const stageTones: Record<DealStage, string> = {
  NEW: "bg-gray-100 text-gray-600",
  QUALIFICATION: "bg-blue-100 text-blue-700",
  DISCOVERY: "bg-cyan-100 text-cyan-700",
  PROPOSAL: "bg-indigo-100 text-indigo-700",
  NEGOTIATION: "bg-violet-100 text-violet-700",
  HOLD: "bg-amber-100 text-amber-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const stages: DealStage[] = ["NEW", "QUALIFICATION", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "HOLD", "WON", "LOST", "CANCELLED"];
const priorities: ProjectPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

interface DealForm {
  name: string;
  client: number | "";
  client_contact: string;
  salesperson: number | "";
  sales_manager: number | "";
  presales_owner: number | "";
  pmo: number | "";
  project_manager: number | "";
  stage: DealStage;
  priority: ProjectPriority;
  amount: string;
  currency: string;
  probability: number;
  region: string;
  lead_source: string;
  solution: string;
  technology: string;
  competitor: string;
  decision_maker: string;
  next_action: string;
  next_action_date: string;
  expected_start_date: string;
  expected_end_date: string;
  expected_close_date: string;
  notes: string;
}

function emptyForm(defaultSalesperson: number | null): DealForm {
  return {
    name: "", client: "", client_contact: "",
    salesperson: defaultSalesperson ?? "", sales_manager: "", presales_owner: "", pmo: "", project_manager: "",
    stage: "NEW", priority: "MEDIUM", amount: "0", currency: "INR", probability: 10,
    region: "", lead_source: "", solution: "", technology: "", competitor: "", decision_maker: "",
    next_action: "", next_action_date: "", expected_start_date: "", expected_end_date: "",
    expected_close_date: "", notes: "",
  };
}

export default function SalesProjects() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const { data: deals, isLoading } = useQuery({
    queryKey: ["sales-projects", { search, stageFilter }],
    queryFn: () => getSalesProjects({ ...(search ? { search } : {}), ...(stageFilter ? { stage: stageFilter } : {}) }),
  });
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => getClients() });
  const { data: team } = useQuery({ queryKey: ["team-directory"], queryFn: getTeamDirectory });
  const salesTeam = team?.filter((m) => m.role === "SALESPERSON" || m.role === "SALES_MANAGER") ?? [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalesProject | null>(null);
  const [form, setForm] = useState<DealForm>(emptyForm(currentUser?.id ?? null));
  const [formError, setFormError] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["sales-projects"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  }

  const createMutation = useMutation({
    mutationFn: createSalesProject,
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (error) => setFormError(formatApiError(error)),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SalesProject> }) => updateSalesProject(id, data),
    onSuccess: () => { invalidate(); closeModal(); },
    onError: (error) => setFormError(formatApiError(error)),
  });
  const convertMutation = useMutation({
    mutationFn: (id: number) => convertToProject(id),
    onSuccess: () => { invalidate(); setConvertError(null); },
    onError: (error) => setConvertError(formatApiError(error)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(currentUser?.id ?? null));
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEdit(deal: SalesProject) {
    setEditing(deal);
    setForm({
      name: deal.name, client: deal.client, client_contact: deal.client_contact,
      salesperson: deal.salesperson, sales_manager: deal.sales_manager ?? "",
      presales_owner: deal.presales_owner ?? "", pmo: deal.pmo ?? "", project_manager: deal.project_manager ?? "",
      stage: deal.stage, priority: deal.priority, amount: deal.amount, currency: deal.currency,
      probability: deal.probability, region: deal.region, lead_source: deal.lead_source,
      solution: deal.solution, technology: deal.technology, competitor: deal.competitor,
      decision_maker: deal.decision_maker, next_action: deal.next_action,
      next_action_date: deal.next_action_date ?? "", expected_start_date: deal.expected_start_date ?? "",
      expected_end_date: deal.expected_end_date ?? "", expected_close_date: deal.expected_close_date ?? "",
      notes: deal.notes,
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
      client: form.client || null,
      salesperson: form.salesperson || null,
      sales_manager: form.sales_manager || null,
      presales_owner: form.presales_owner || null,
      pmo: form.pmo || null,
      project_manager: form.project_manager || null,
      next_action_date: form.next_action_date || null,
      expected_start_date: form.expected_start_date || null,
      expected_end_date: form.expected_end_date || null,
      expected_close_date: form.expected_close_date || null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Sales Projects</h1>
          <p className="text-sm text-gray-500">
            The master source of truth for every opportunity — Deals is a pipeline view of this same data.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} /> New Sales Project
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search sales projects..."
            className="w-72 rounded-md border border-gray-300 pl-8 pr-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
        >
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {convertError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {convertError}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading sales projects...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Opportunity</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Weighted</th>
                <th className="px-4 py-3">Expected Close</th>
                <th className="px-4 py-3">Project</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deals?.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800 cursor-pointer" onClick={() => openEdit(d)}>
                    <span className="flex items-center gap-2">
                      <Briefcase size={14} className="text-indigo-500" />
                      {d.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => openEdit(d)}>
                    {d.client_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => openEdit(d)}>
                    {d.salesperson_name}
                  </td>
                  <td className="px-4 py-3 cursor-pointer" onClick={() => openEdit(d)}>
                    <span className={`text-xs px-2 py-1 rounded-full ${stageTones[d.stage]}`}>
                      {DEAL_STAGE_LABELS[d.stage]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 cursor-pointer" onClick={() => openEdit(d)}>
                    {d.currency} {Number(d.amount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => openEdit(d)}>
                    {d.currency} {d.weighted_amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => openEdit(d)}>
                    {d.expected_close_date ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {d.linked_project_code ? (
                      <span className="text-xs text-gray-500">{d.linked_project_code}</span>
                    ) : d.stage === "WON" ? (
                      <button
                        onClick={() => convertMutation.mutate(d.id)}
                        disabled={convertMutation.isPending}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                      >
                        <ArrowRightCircle size={13} /> Create Project
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deals?.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6 text-center">No sales projects match these filters.</p>
          )}
        </div>
      )}

      {isModalOpen && (
        <Modal title={editing ? "Edit Sales Project" : "New Sales Project"} onClose={closeModal} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity name</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.client}
                  onChange={(e) => setForm({ ...form, client: e.target.value ? Number(e.target.value) : "" })}
                  required
                >
                  <option value="">Select a client</option>
                  {clients?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client contact</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.client_contact}
                  onChange={(e) => setForm({ ...form, client_contact: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salesperson</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.salesperson}
                  onChange={(e) => setForm({ ...form, salesperson: e.target.value ? Number(e.target.value) : "" })}
                  required
                >
                  <option value="">Select owner</option>
                  {salesTeam.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales manager</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.sales_manager}
                  onChange={(e) => setForm({ ...form, sales_manager: e.target.value ? Number(e.target.value) : "" })}
                >
                  <option value="">—</option>
                  {salesTeam.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value as DealStage })}
                >
                  {stages.map((s) => (
                    <option key={s} value={s}>{DEAL_STAGE_LABELS[s]}</option>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number" step="0.01" min="0"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
                <input
                  type="number" min="0" max="100"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.probability}
                  onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected close date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.expected_close_date}
                  onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected start</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.expected_start_date}
                    onChange={(e) => setForm({ ...form, expected_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected end</label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.expected_end_date}
                    onChange={(e) => setForm({ ...form, expected_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead source</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.lead_source}
                  onChange={(e) => setForm({ ...form, lead_source: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technology</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.technology}
                  onChange={(e) => setForm({ ...form, technology: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competitor</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.competitor}
                  onChange={(e) => setForm({ ...form, competitor: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decision maker</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.decision_maker}
                  onChange={(e) => setForm({ ...form, decision_maker: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next action</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.next_action}
                  onChange={(e) => setForm({ ...form, next_action: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next action date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.next_action_date}
                  onChange={(e) => setForm({ ...form, next_action_date: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Solution</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  value={form.solution}
                  onChange={(e) => setForm({ ...form, solution: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
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
                {isSaving ? "Saving..." : editing ? "Save changes" : "Create sales project"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
