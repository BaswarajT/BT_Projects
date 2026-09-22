import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Pencil, Plus, X } from "lucide-react";

import Modal from "../components/Modal";
import { createCompany, getCompanies, updateCompany } from "../services/companyService";

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

export default function Companies() {
  const queryClient = useQueryClient();
  const { data: companies, isLoading } = useQuery({ queryKey: ["companies"], queryFn: getCompanies });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsModalOpen(false);
      setName("");
      setCode("");
      setFormError(null);
    },
    onError: (error) => setFormError(formatApiError(error)),
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateCompany(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setEditingId(null);
      setEditError(null);
    },
    onError: (error) => setEditError(formatApiError(error)),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate({ name, code: code.toUpperCase() });
  }

  function closeModal() {
    setIsModalOpen(false);
    setFormError(null);
  }

  function startEditing(id: number, currentName: string) {
    setEditingId(id);
    setEditName(currentName);
    setEditError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditError(null);
  }

  function saveEditing(id: number) {
    if (!editName.trim()) return;
    renameMutation.mutate({ id, name: editName.trim() });
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>, id: number) {
    if (e.key === "Enter") saveEditing(id);
    if (e.key === "Escape") cancelEditing();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Companies</h1>
          <p className="text-sm text-gray-500">All tenant companies on the platform.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} /> New Company
        </button>
      </div>

      {editError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {editError}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading companies...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Projects</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies?.map((company) => (
                <tr key={company.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {editingId === company.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          className="rounded-md border border-indigo-300 px-2 py-1 text-sm w-48"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, company.id)}
                        />
                        <button
                          onClick={() => saveEditing(company.id)}
                          disabled={renameMutation.isPending}
                          title="Save"
                          className="text-green-600 hover:text-green-700 disabled:opacity-50"
                        >
                          <Check size={16} />
                        </button>
                        <button onClick={cancelEditing} title="Cancel" className="text-gray-400 hover:text-red-600">
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <Building2 size={16} className="text-indigo-500" />
                        {company.name}
                        <button
                          onClick={() => startEditing(company.id, company.name)}
                          title="Rename company (Global Admin only)"
                          className="text-gray-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{company.code}</td>
                  <td className="px-4 py-3 text-gray-700">{company.user_count}</td>
                  <td className="px-4 py-3 text-gray-700">{company.project_count}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        company.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {company.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(company.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {companies?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                    No companies yet. Create the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <Modal title="New Company" onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company name</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase"
                placeholder="e.g. ACME01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
