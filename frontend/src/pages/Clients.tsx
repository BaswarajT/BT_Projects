import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";

import Modal from "../components/Modal";
import { COUNTRIES } from "../constants/countries";
import { useAuth } from "../context/AuthContext";
import { createClient, getClients, updateClient } from "../services/clientService";
import { getTeamDirectory } from "../services/teamDirectoryService";
import type { Client, ClientStatus } from "../types";

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

const statusTones: Record<ClientStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-500",
};

interface ClientForm {
  name: string;
  industry: string;
  website: string;
  country: string;
  state: string;
  city: string;
  primary_contact_name: string;
  contact_email: string;
  contact_phone: string;
  salesperson: number | null;
  account_manager: number | null;
  status: ClientStatus;
  notes: string;
}

const emptyForm: ClientForm = {
  name: "",
  industry: "",
  website: "",
  country: "",
  state: "",
  city: "",
  primary_contact_name: "",
  contact_email: "",
  contact_phone: "",
  salesperson: null,
  account_manager: null,
  status: "ACTIVE",
  notes: "",
};

export default function Clients() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", { search }],
    queryFn: () => getClients(search ? { search } : undefined),
  });
  const { data: team } = useQuery({ queryKey: ["team-directory"], queryFn: getTeamDirectory });
  const salesTeam = team?.filter((m) => m.role === "SALESPERSON" || m.role === "SALES_MANAGER") ?? [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      closeModal();
    },
    onError: (error) => setFormError(formatApiError(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Client> }) => updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      closeModal();
    },
    onError: (error) => setFormError(formatApiError(error)),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, salesperson: currentUser?.id ?? null });
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name,
      industry: client.industry,
      website: client.website,
      country: client.country,
      state: client.state,
      city: client.city,
      primary_contact_name: client.primary_contact_name,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone,
      salesperson: client.salesperson,
      account_manager: client.account_manager,
      status: client.status,
      notes: client.notes,
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
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Clients</h1>
          <p className="text-sm text-gray-500">Client accounts and relationship ownership.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} /> New Client
        </button>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          placeholder="Search clients..."
          className="w-full rounded-md border border-gray-300 pl-8 pr-3 py-2 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading clients...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-4 py-3">Deals</th>
                <th className="px-4 py-3">Active Projects</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients?.map((c) => (
                <tr key={c.id} onClick={() => openEdit(c)} className="cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <span className="flex items-center gap-2">
                      <Building2 size={15} className="text-indigo-500" />
                      {c.name}
                      {c.industry && <span className="text-xs text-gray-400">({c.industry})</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {c.primary_contact_name || "—"}
                    {c.contact_email && <div className="text-xs text-gray-400">{c.contact_email}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.salesperson_name || "—"}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {c.won_deals}/{c.total_deals} won
                  </td>
                  <td className="px-4 py-3 text-gray-700">{c.active_projects}</td>
                  <td className="px-4 py-3 text-gray-700">{c.total_revenue.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusTones[c.status]}`}>
                      {c.status === "ACTIVE" ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {clients?.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6 text-center">
              {search ? "No clients match this search." : "No clients yet."}
            </p>
          )}
        </div>
      )}

      {isModalOpen && (
        <Modal title={editing ? "Edit Client" : "New Client"} onClose={closeModal} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Client name</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                >
                  <option value="">—</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary contact</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.primary_contact_name}
                  onChange={(e) => setForm({ ...form, primary_contact_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact phone</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salesperson</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.salesperson ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, salesperson: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">Unassigned</option>
                  {salesTeam.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account manager</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.account_manager ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, account_manager: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">Unassigned</option>
                  {team?.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
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
                {isSaving ? "Saving..." : editing ? "Save changes" : "Create client"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
