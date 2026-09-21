import { useState, type FormEvent } from "react";

import type { Task, TaskPriority } from "../types";

interface TaskFormProps {
  projectId: number;
  onSubmit: (data: Partial<Task>) => Promise<void>;
  onCancel: () => void;
}

const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function TaskForm({ projectId, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        project: projectId,
        title,
        description,
        priority,
        due_date: dueDate || null,
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
        : "Could not create task. Please try again.";
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            {priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
          <input
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
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
          {isSubmitting ? "Saving..." : "Create task"}
        </button>
      </div>
    </form>
  );
}
