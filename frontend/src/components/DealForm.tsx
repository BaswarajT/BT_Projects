import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import { getClients } from "../services/clientService";
import { getCompanies } from "../services/companyService";
import { getTeamDirectory } from "../services/teamDirectoryService";
import { useAuth } from "../context/AuthContext";
import { DEAL_STAGE_LABELS, type DealStage, type ProjectPriority, type SalesProject } from "../types";

interface DealFormProps {
  initial?: SalesProject;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

const stages: DealStage[] = [
  "NEW", "QUALIFICATION", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "HOLD", "WON", "LOST", "CANCELLED",
];
const priorities: ProjectPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

interface DealFormState {
  name: string;
  company: number | "";
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

function emptyForm(defaultSalesperson: number | null): DealFormState {
  return {
    name: "", company: "", client: "", client_contact: "",
    salesperson: defaultSalesperson ?? "", sales_manager: "", presales_owner: "", pmo: "", project_manager: "",
    stage: "NEW", priority: "MEDIUM", amount: "0", currency: "INR", probability: 10,
    region: "", lead_source: "", solution: "", technology: "", competitor: "", decision_maker: "",
    next_action: "", next_action_date: "", expected_start_date: "", expected_end_date: "",
    expected_close_date: "", notes: "",
  };
}

function fromDeal(deal: SalesProject): DealFormState {
  return {
    name: deal.name, company: deal.company ?? "", client: deal.client, client_contact: deal.client_contact,
    salesperson: deal.salesperson, sales_manager: deal.sales_manager ?? "",
    presales_owner: deal.presales_owner ?? "", pmo: deal.pmo ?? "", project_manager: deal.project_manager ?? "",
    stage: deal.stage, priority: deal.priority, amount: deal.amount, currency: deal.currency,
    probability: deal.probability, region: deal.region, lead_source: deal.lead_source,
    solution: deal.solution, technology: deal.technology, competitor: deal.competitor,
    decision_maker: deal.decision_maker, next_action: deal.next_action,
    next_action_date: deal.next_action_date ?? "", expected_start_date: deal.expected_start_date ?? "",
    expected_end_date: deal.expected_end_date ?? "", expected_close_date: deal.expected_close_date ?? "",
    notes: deal.notes,
  };
}

export default function DealForm({ initial, onSubmit, onCancel }: DealFormProps) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState<DealFormState>(
    initial ? fromDeal(initial) : emptyForm(currentUser?.id ?? null)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGlobalAdmin = currentUser?.role === "GLOBAL_ADMIN";
  const { data: clients } = useQuery({ queryKey: ["clients"], queryFn: () => getClients() });
  const { data: team } = useQuery({ queryKey: ["team-directory"], queryFn: getTeamDirectory });
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
    enabled: isGlobalAdmin,
  });
  const salesTeam = team?.filter((m) => m.role === "SALESPERSON" || m.role === "SALES_MANAGER") ?? [];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const payload: Record<string, unknown> = {
      ...form,
      company: form.company || null,
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
    try {
      await onSubmit(payload);
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data;
      const message = data
        ? Object.entries(data)
            .map(([field, messages]) => {
              const text = Array.isArray(messages) ? messages.join(" ") : messages;
              return field === "non_field_errors" ? text : `${field}: ${text}`;
            })
            .join(" ")
        : "Could not save the deal. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
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
        {isGlobalAdmin && (
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <select
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value ? Number(e.target.value) : "" })}
              required
            >
              <option value="">Select a company</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
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
            placeholder="Referral, Inbound, Outbound, Partner, Event..."
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Next step</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={form.next_action}
            onChange={(e) => setForm({ ...form, next_action: e.target.value })}
            placeholder="What happens next on this deal?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Next step date</label>
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
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : initial ? "Save changes" : "Create deal"}
        </button>
      </div>
    </form>
  );
}
