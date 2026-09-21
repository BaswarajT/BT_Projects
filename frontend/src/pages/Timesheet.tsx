import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";

import Modal from "../components/Modal";
import TimeEntryForm from "../components/TimeEntryForm";
import { useAuth } from "../context/AuthContext";
import { createTimeEntry, deleteTimeEntry, getTimeEntries, updateTimeEntry } from "../services/timeEntryService";
import type { TimeEntry } from "../types";

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Timesheet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState(startOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TimeEntry | null>(null);

  const { data: entries, isLoading } = useQuery({
    queryKey: ["time-entries", { user: user?.id, dateFrom, dateTo }],
    queryFn: () =>
      getTimeEntries({
        user: String(user?.id),
        date_from: dateFrom,
        date_to: dateTo,
      }),
    enabled: !!user,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["time-entries"] });
  }

  const createMutation = useMutation({
    mutationFn: (data: Partial<TimeEntry>) => createTimeEntry(data),
    onSuccess: () => {
      invalidate();
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TimeEntry> }) => updateTimeEntry(id, data),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTimeEntry(id),
    onSuccess: invalidate,
  });

  const totalHours = entries?.reduce((sum, e) => sum + Number(e.hours), 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Timesheet</h1>
          <p className="text-sm text-gray-500">Log your hours against projects and tasks.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} /> Log Time
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="ml-auto bg-white rounded-lg border border-gray-200 px-4 py-2">
          <p className="text-xs text-gray-500">Total logged</p>
          <p className="text-lg font-semibold text-gray-800">{totalHours.toFixed(2)}h</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Project</th>
              <th className="px-4 py-2">Task</th>
              <th className="px-4 py-2">Hours</th>
              <th className="px-4 py-2">Note</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries?.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-2 whitespace-nowrap text-gray-700">{entry.date}</td>
                <td className="px-4 py-2 text-gray-700">{entry.project_name}</td>
                <td className="px-4 py-2 text-gray-700">{entry.task_title}</td>
                <td className="px-4 py-2 text-gray-700">{Number(entry.hours).toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500">{entry.note}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => setEditing(entry)} className="text-gray-400 hover:text-indigo-600">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this time entry?")) deleteMutation.mutate(entry.id);
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
        {!isLoading && entries?.length === 0 && (
          <p className="text-sm text-gray-400 px-4 py-4">No time entries in this range.</p>
        )}
      </div>

      {isModalOpen && (
        <Modal title="Log Time" onClose={() => setIsModalOpen(false)}>
          <TimeEntryForm
            onCancel={() => setIsModalOpen(false)}
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
            }}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Time Entry" onClose={() => setEditing(null)}>
          <TimeEntryForm
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
