import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

import Modal from "../components/Modal";
import TaskForm from "../components/TaskForm";
import TaskCard from "../components/TaskCard";
import { getProject } from "../services/projectService";
import { createTask, getTasks } from "../services/taskService";
import type { Task } from "../types";

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", { project: projectId }],
    queryFn: () => getTasks({ project: String(projectId) }),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Task>) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", { project: projectId }] });
      setIsModalOpen(false);
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{project?.name ?? "Loading..."}</h1>
          <p className="text-sm text-gray-500">{project?.code}</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1 bg-indigo-600 text-white text-sm px-3 py-2 rounded-md hover:bg-indigo-700"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading tasks...</p>
      ) : (
        <div className="space-y-2">
          {tasks?.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {isModalOpen && (
        <Modal title="New Task" onClose={() => setIsModalOpen(false)}>
          <TaskForm
            projectId={projectId}
            onCancel={() => setIsModalOpen(false)}
            onSubmit={async (data) => {
              await createMutation.mutateAsync(data);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
