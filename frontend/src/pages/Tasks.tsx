import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import TaskCard from "../components/TaskCard";
import { getTasks } from "../services/taskService";
import type { TaskPriority, TaskStatus } from "../types";

const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "DONE", "CANCELLED"];
const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export default function Tasks() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", { search, status, priority }],
    queryFn: () =>
      getTasks({
        ...(search ? { search } : {}),
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      }),
  });

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Tasks</h1>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          placeholder="Search tasks..."
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <select
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">All priorities</option>
          {priorities.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading tasks...</p>
      ) : (
        <div className="space-y-2">
          {tasks?.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks?.length === 0 && <p className="text-sm text-gray-400">No tasks match these filters.</p>}
        </div>
      )}
    </div>
  );
}
