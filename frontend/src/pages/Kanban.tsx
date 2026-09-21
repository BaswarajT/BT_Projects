import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import TaskCard from "../components/TaskCard";
import { getTasks, updateTask } from "../services/taskService";
import type { Task, TaskStatus } from "../types";

const columns: { key: TaskStatus; label: string }[] = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "IN_REVIEW", label: "In Review" },
  { key: "BLOCKED", label: "Blocked" },
  { key: "DONE", label: "Done" },
];

export default function Kanban() {
  const queryClient = useQueryClient();
  const { data: tasks } = useQuery({ queryKey: ["tasks", {}], queryFn: () => getTasks() });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) => updateTask(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  function handleDragStart(e: React.DragEvent, task: Task) {
    e.dataTransfer.setData("taskId", String(task.id));
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const taskId = Number(e.dataTransfer.getData("taskId"));
    if (taskId) updateStatusMutation.mutate({ id: taskId, status });
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-6">Kanban Board</h1>
      <div className="flex gap-4 overflow-x-auto">
        {columns.map((column) => (
          <div
            key={column.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, column.key)}
            className="flex-shrink-0 w-64 bg-gray-100 rounded-lg p-3"
          >
            <h2 className="text-sm font-semibold text-gray-700 mb-3">{column.label}</h2>
            {tasks
              ?.filter((task) => task.status === column.key)
              .map((task) => (
                <TaskCard key={task.id} task={task} draggable onDragStart={handleDragStart} />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
