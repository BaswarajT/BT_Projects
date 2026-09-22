import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";

import { getProjects } from "../services/projectService";
import type { Milestone } from "../types";

interface MilestoneFormProps {
  initial?: Milestone;
  defaultProjectId?: number;
  onSubmit: (data: Partial<Milestone>) => Promise<void>;
  onCancel: () => void;
}

export default function MilestoneForm({ initial, defaultProjectId, onSubmit, onCancel }: MilestoneFormProps) {
  const [projectId, setProjectId] = useState(
    initial ? String(initial.project) : defaultProjectId ? String(defaultProjectId) : ""
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dueDate, setDueDate] = useState(initial?.due_date ?? "");
  const [isCompleted, setIsCompleted] = useState(initial?.is_completed ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => getProjects() });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        project: Number(projectId),
        title,
        description,
        due_date: dueDate || null,
        is_completed: isCompleted,
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
        : "Could not save the milestone. Please try again.";
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
          onChange={(e) => setProjectId(e.target.value)}
          required
          disabled={!!defaultProjectId}
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this milestone cover?"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
          <input
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={isCompleted}
            onChange={(e) => setIsCompleted(e.target.checked)}
          />
          Completed
        </label>
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
          {isSubmitting ? "Saving..." : initial ? "Save changes" : "Create milestone"}
        </button>
      </div>
    </form>
  );
}
