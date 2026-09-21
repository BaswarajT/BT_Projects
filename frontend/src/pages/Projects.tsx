import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import ProjectCard from "../components/ProjectCard";
import Modal from "../components/Modal";
import { createProject, getProjects } from "../services/projectService";
import type { ProjectPriority } from "../types";

const priorities: ProjectPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const emptyForm = {
  name: "",
  code: "",
  description: "",
  pmo_name: "",
  region: "",
  state: "",
  priority: "MEDIUM" as ProjectPriority,
  budget: "",
  start_date: "",
  end_date: "",
};

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

export default function Projects() {
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useQuery({ queryKey: ["projects"], queryFn: getProjects });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsModalOpen(false);
      setForm(emptyForm);
      setFormError(null);
    },
    onError: (error) => {
      setFormError(formatApiError(error));
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    createMutation.mutate({
      ...form,
      status: "PLANNING",
      budget: form.budget || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
  }

  function closeModal() {
    setIsModalOpen(false);
    setFormError(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-800">Projects</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading projects...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <Modal title="New Project" onClose={closeModal} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PMO name</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.pmo_name}
                  onChange={(e) => setForm({ ...form, pmo_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. APAC, EMEA, NA"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. California"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="0.00"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>
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
