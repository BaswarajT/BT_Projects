import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";

import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { getCompanies } from "../services/companyService";
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUsers,
  updateManagedUser,
  type ManagedUserInput,
} from "../services/userManagementService";
import { ROLE_LABELS, type Role } from "../types";

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

const roleTones: Record<Role, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-indigo-100 text-indigo-700",
  PROJECT_MANAGER: "bg-blue-100 text-blue-700",
  TEAM_LEAD: "bg-cyan-100 text-cyan-700",
  MEMBER: "bg-gray-100 text-gray-600",
  CLIENT: "bg-amber-100 text-amber-700",
  VIEWER: "bg-gray-100 text-gray-500",
};

const emptyForm: ManagedUserInput = {
  username: "",
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "MEMBER",
  company: null,
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({ queryKey: ["managed-users"], queryFn: getManagedUsers });
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
    enabled: isSuperAdmin,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ManagedUserInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const availableRoles: Role[] = isSuperAdmin
    ? ["SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TEAM_LEAD", "MEMBER", "CLIENT", "VIEWER"]
    : ["ADMIN", "PROJECT_MANAGER", "TEAM_LEAD", "MEMBER", "CLIENT", "VIEWER"];

  const createMutation = useMutation({
    mutationFn: createManagedUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsModalOpen(false);
      setForm(emptyForm);
      setFormError(null);
    },
    onError: (error) => setFormError(formatApiError(error)),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) => updateManagedUser(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["managed-users"] }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => updateManagedUser(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["managed-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteManagedUser,
    onSuccess: () => {
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error) => setDeleteError(formatApiError(error)),
  });

  function handleDelete(id: number, username: string) {
    if (!window.confirm(`Permanently delete "${username}"? This cannot be undone.`)) return;
    setDeleteError(null);
    deleteMutation.mutate(id);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate(form);
  }

  function closeModal() {
    setIsModalOpen(false);
    setFormError(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {isSuperAdmin ? "All Users" : "Team"}
          </h1>
          <p className="text-sm text-gray-500">
            {isSuperAdmin
              ? "Every user across every company on the platform."
              : "Manage roles and access for your company."}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading users...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                {isSuperAdmin && <th className="px-4 py-3">Company</th>}
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                {isSuperAdmin && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <span className="flex items-center gap-1.5">
                      {u.role === "SUPER_ADMIN" && <ShieldCheck size={14} className="text-purple-600" />}
                      {u.username}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-gray-600">{u.company_name || "(platform)"}</td>
                  )}
                  <td className="px-4 py-3">
                    {u.id === currentUser?.id ? (
                      <span className={`text-xs px-2 py-1 rounded-full ${roleTones[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    ) : (
                      <select
                        className={`text-xs rounded-full px-2 py-1 border-0 font-medium ${roleTones[u.role]}`}
                        value={u.role}
                        onChange={(e) =>
                          roleMutation.mutate({ id: u.id, role: e.target.value as Role })
                        }
                      >
                        {availableRoles.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.id === currentUser?.id ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span>
                    ) : (
                      <button
                        onClick={() => activeMutation.mutate({ id: u.id, is_active: !u.is_active })}
                        className={`text-xs px-2 py-1 rounded-full ${
                          u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {u.is_active ? "Active" : "Deactivated"}
                      </button>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3">
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          disabled={deleteMutation.isPending}
                          title="Delete user"
                          className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <Modal title="Add User" onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary password <span className="text-gray-400 font-normal">(optional — random if blank)</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.company ?? ""}
                    onChange={(e) => setForm({ ...form, company: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">(platform / no company)</option>
                    {companies?.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
