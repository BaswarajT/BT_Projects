import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import { getProjects } from "../services/projectService";
import { getTasks } from "../services/taskService";
import type { TimeEntry } from "../types";

interface TimeEntryFormProps {
  initial?: TimeEntry;
  onSubmit: (data: Partial<TimeEntry>) => Promise<void>;
  onCancel: () => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function TimeEntryForm({ initial, onSubmit, onCancel }: TimeEntryFormProps) {
  const [projectId, setProjectId] = useState(initial ? String(initial.project) : "");
  const [taskId, setTaskId] = useState(initial ? String(initial.task) : "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [hours, setHours] = useState(initial?.hours ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => getProjects() });
  const { data: tasks } = useQuery({
    queryKey: ["tasks", { project: projectId }],
    queryFn: () => getTasks({ project: projectId }),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (taskId && tasks && !tasks.some((t) => String(t.id) === taskId)) {
      setTaskId("");
    }
  }, [tasks, taskId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        task: Number(taskId),
        date,
        hours,
        note,
      });
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, string[] | string> } })?.response?.data;
      const message = data
        ? Object.entries(data)
            .map(([field, messages]) => {
              const text = Array.isArray(messages) ? messages.join(" ") : messages;
              return field === "non_field_errors" ? text : `${field}: ${text}`;
            })
            .join(" ")
        : "Could not save the time entry. Please try again.";
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
        <select
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={projectId}
          onChange={(e) => {
            setProjectId(e.target.value);
            setTaskId("");
          }}
          required
        >
          <option value="">Select a project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Task</label>
        <select
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          required
          disabled={!projectId}
        >
          <option value="">{projectId ? "Select a task" : "Select a project first"}</option>
          {tasks?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
          <input
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you work on?"
        />
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
          {isSubmitting ? "Saving..." : initial ? "Save changes" : "Log time"}
        </button>
      </div>
    </form>
  );
}
