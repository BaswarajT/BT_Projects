import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";

import Modal from "../components/Modal";
import MilestoneForm from "../components/MilestoneForm";
import { createMilestone, deleteMilestone, getMilestones, updateMilestone } from "../services/milestoneService";
import type { Milestone } from "../types";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function StatusBadge({ milestone }: { milestone: Milestone }) {
  if (milestone.is_completed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
        <CheckCircle2 size={12} /> Completed
      </span>
    );
  }
  const overdue = milestone.due_date && milestone.due_date < todayISO();
  if (overdue) {
    return <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">Overdue</span>;
  }
  return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Upcoming</span>;
}

export default function Milestones() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  const { data: milestones, isLoading } = useQuery({ queryKey: ["milestones"], queryFn: () => getMilestones() });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["milestones"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  const createMutation = useMutation({
    mutationFn: (data: Partial<Milestone>) => createMilestone(data),
    onSuccess: () => {
      invalidate();
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Milestone> }) => updateMilestone(id, data),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (m: Milestone) => updateMilestone(m.id, { is_completed: !m.is_completed }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMilestone(id),
    onSuccess: invalidate,
  });

  const visible = useMemo(() => {
    const list = milestones ?? [];
    const filtered = showCompleted ? list : list.filter((m) => !m.is_completed);
    return [...filtered].sort((a, b) => {
      if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
      return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
    });
  }, [milestones, showCompleted]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Milestones</h1>
          <p className="text-sm text-gray-500">Key delivery dates across your projects.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} /> New Milestone
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show completed
        </label>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 w-8" />
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Project</th>
              <th className="px-4 py-2">Due date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((m) => (
              <tr key={m.id} className={m.is_completed ? "opacity-60" : ""}>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleMutation.mutate(m)}
                    title={m.is_completed ? "Mark as not completed" : "Mark as completed"}
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      m.is_completed ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-indigo-500"
                    }`}
                  >
                    {m.is_completed && <CheckCircle2 size={12} className="text-white" />}
                  </button>
                </td>
                <td className="px-4 py-2">
                  <p className={`font-medium text-gray-800 ${m.is_completed ? "line-through" : ""}`}>{m.title}</p>
                  {m.description && <p className="text-xs text-gray-500 line-clamp-1">{m.description}</p>}
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {m.project_name} <span className="text-gray-400">({m.project_code})</span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-gray-700">{m.due_date || "—"}</td>
                <td className="px-4 py-2">
                  <StatusBadge milestone={m} />
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setEditing(m)} className="text-gray-400 hover:text-indigo-600">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete milestone "${m.title}"?`)) deleteMutation.mutate(m.id);
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <p className="text-sm text-gray-500 px-4 py-4">Loading...</p>}
        {!isLoading && visible.length === 0 && (
          <p className="text-sm text-gray-400 px-4 py-4">No milestones yet.</p>
        )}
      </div>

      {isModalOpen && (
        <Modal title="New Milestone" onClose={() => setIsModalOpen(false)}>
          <MilestoneForm
            onCancel={() => setIsModalOpen(false)}
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
            }}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Milestone" onClose={() => setEditing(null)}>
          <MilestoneForm
            initial={editing}
            onCancel={() => setEditing(null)}
            onSubmit={async (data) => {
              await updateMutation.mutateAsync({ id: editing.id, data });
            }}
          />
        </Modal>
      )}
    </div>
  );
}
