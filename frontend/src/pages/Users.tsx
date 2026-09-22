import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, RotateCcw, Search, ShieldCheck, Trash2, X } from "lucide-react";

import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { getCompanies, updateCompany } from "../services/companyService";
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUsers,
  getRecycleBinUsers,
  restoreManagedUser,
  updateManagedUser,
  type ManagedUserInput,
} from "../services/userManagementService";
import { ROLE_LABELS, type Role, type User } from "../types";

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
  GLOBAL_ADMIN: "bg-purple-100 text-purple-700",
  SUPER_ADMIN: "bg-violet-100 text-violet-700",
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

type View = "active" | "recycle";

export default function Users() {
  const { user: currentUser } = useAuth();
  // Only Global Admin and Super Admin ever reach this page (see RequireRole in App.tsx).
  const isGlobalAdmin = currentUser?.role === "GLOBAL_ADMIN";
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("active");
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["managed-users", { search }],
    queryFn: () => getManagedUsers(search || undefined),
    enabled: view === "active",
  });
  const { data: deletedUsers, isLoading: isLoadingRecycleBin } = useQuery({
    queryKey: ["recycle-bin-users", { search }],
    queryFn: () => getRecycleBinUsers(search || undefined),
    enabled: view === "recycle",
  });
  const { data: companies } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies,
    enabled: isGlobalAdmin,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<ManagedUserInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Several rows can share the same company, so "which row is being edited" is tracked
  // separately from "which company that edit will save to" — otherwise every row for
  // that company would render its own input at once and fight over focus.
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [companyEditError, setCompanyEditError] = useState<string | null>(null);

  // Global Admin can hand out any role, including Global Admin and Super Admin.
  // Super Admin can hand out Admin and below only — never Super Admin or Global Admin.
  const availableRoles: Role[] = isGlobalAdmin
    ? ["GLOBAL_ADMIN", "SUPER_ADMIN", "ADMIN", "PROJECT_MANAGER", "TEAM_LEAD", "MEMBER", "CLIENT", "VIEWER"]
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
      queryClient.invalidateQueries({ queryKey: ["recycle-bin-users"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error) => setDeleteError(formatApiError(error)),
  });

  const restoreMutation = useMutation({
    mutationFn: restoreManagedUser,
    onSuccess: () => {
      setDeleteError(null);
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      queryClient.invalidateQueries({ queryKey: ["recycle-bin-users"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
    onError: (error) => setDeleteError(formatApiError(error)),
  });

  const renameCompanyMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => updateCompany(id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managed-users"] });
      queryClient.invalidateQueries({ queryKey: ["recycle-bin-users"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setEditingRowKey(null);
      setEditingCompanyId(null);
      setCompanyEditError(null);
    },
    onError: (error) => setCompanyEditError(formatApiError(error)),
  });

  function handleDelete(id: number, username: string) {
    if (!window.confirm(`Move "${username}" to the Recycle Bin? You can restore it later.`)) return;
    setDeleteError(null);
    deleteMutation.mutate(id);
  }

  function startEditingCompany(rowKey: string, companyId: number, currentName: string) {
    setEditingRowKey(rowKey);
    setEditingCompanyId(companyId);
    setEditCompanyName(currentName);
    setCompanyEditError(null);
  }

  function cancelEditingCompany() {
    setEditingRowKey(null);
    setEditingCompanyId(null);
    setCompanyEditError(null);
  }

  function saveEditingCompany() {
    if (!editCompanyName.trim() || editingCompanyId === null) return;
    renameCompanyMutation.mutate({ id: editingCompanyId, name: editCompanyName.trim() });
  }

  function handleCompanyEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") saveEditingCompany();
    if (e.key === "Escape") cancelEditingCompany();
  }

  // Company names can only ever be changed by Global Admin (enforced server-side too) —
  // Super Admin/Admin viewing this page see the company name as plain read-only text.
  // `rowKey` must be unique per row (not per company) since several users can share a
  // company — only the exact row that was clicked should render the live input.
  function renderCompanyCell(u: User, rowKey: string) {
    if (!isGlobalAdmin) return <td className="px-4 py-3 text-gray-600">{u.company_name || "(platform)"}</td>;
    if (!u.company) return <td className="px-4 py-3 text-gray-600">(platform)</td>;

    if (editingRowKey === rowKey) {
      return (
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              className="rounded-md border border-indigo-300 px-2 py-1 text-sm w-36"
              value={editCompanyName}
              onChange={(e) => setEditCompanyName(e.target.value)}
              onKeyDown={handleCompanyEditKeyDown}
            />
            <button
              onClick={saveEditingCompany}
              disabled={renameCompanyMutation.isPending}
              title="Save"
              className="text-green-600 hover:text-green-700 disabled:opacity-50"
            >
              <Check size={15} />
            </button>
            <button onClick={cancelEditingCompany} title="Cancel" className="text-gray-400 hover:text-red-600">
              <X size={15} />
            </button>
          </div>
        </td>
      );
    }

    return (
      <td className="px-4 py-3 text-gray-600">
        <span className="flex items-center gap-1.5 group">
          {u.company_name || "(platform)"}
          <button
            onClick={() => startEditingCompany(rowKey, u.company as number, u.company_name || "")}
            title="Rename company (Global Admin only)"
            className="text-gray-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100"
          >
            <Pencil size={12} />
          </button>
        </span>
      </td>
    );
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
            {isGlobalAdmin ? "All Users" : "Team"}
          </h1>
          <p className="text-sm text-gray-500">
            {isGlobalAdmin
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

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setView("active")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              view === "active"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Active{users ? ` (${users.length})` : ""}
          </button>
          <button
            onClick={() => setView("recycle")}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              view === "recycle"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Recycle Bin{deletedUsers ? ` (${deletedUsers.length})` : ""}
          </button>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search by name, username, or email..."
            className="w-72 rounded-md border border-gray-300 pl-8 pr-3 py-2 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {companyEditError && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {companyEditError}
        </div>
      )}

      {view === "active" && (isLoading ? (
        <p className="text-sm text-gray-500">Loading users...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                {isGlobalAdmin && <th className="px-4 py-3">Company</th>}
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users?.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    <span className="flex items-center gap-1.5">
                      {u.role === "GLOBAL_ADMIN" && <ShieldCheck size={14} className="text-purple-600" />}
                      {u.username}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  {isGlobalAdmin && renderCompanyCell(u, `active-${u.id}`)}
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
                </tr>
              ))}
            </tbody>
          </table>
          {users?.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6 text-center">
              {search ? "No users match this search." : "No users yet."}
            </p>
          )}
        </div>
      ))}

      {view === "recycle" && (isLoadingRecycleBin ? (
        <p className="text-sm text-gray-500">Loading recycle bin...</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                {isGlobalAdmin && <th className="px-4 py-3">Company</th>}
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Deleted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deletedUsers?.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.username}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  {isGlobalAdmin && renderCompanyCell(u, `recycle-${u.id}`)}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${roleTones[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.deleted_at ? new Date(u.deleted_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => restoreMutation.mutate(u.id)}
                      disabled={restoreMutation.isPending}
                      title="Restore and reactivate"
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
                    >
                      <RotateCcw size={13} /> Restore
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deletedUsers?.length === 0 && (
            <p className="text-sm text-gray-400 px-4 py-6 text-center">
              {search ? "No deleted users match this search." : "Recycle bin is empty."}
            </p>
          )}
        </div>
      ))}

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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First name <span className="text-gray-400 font-normal">e.g. Baswaraj</span>
                </label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last name <span className="text-gray-400 font-normal">e.g. Tugashatte</span>
                </label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  required
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
              {isGlobalAdmin && (
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
