import type { Task } from "../types";

const priorityColors: Record<Task["priority"], string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

interface TaskCardProps {
  task: Task;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
}

export default function TaskCard({ task, draggable, onDragStart }: TaskCardProps) {
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task)}
      className="bg-white rounded-md border border-gray-200 p-3 mb-2 cursor-pointer hover:shadow-sm"
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-sm font-medium text-gray-800">{task.title}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
      </div>
      {task.due_date && <p className="text-xs text-gray-400">Due {task.due_date}</p>}
      {task.assigned_to_name && (
        <p className="text-xs text-gray-500 mt-1">Assigned: {task.assigned_to_name}</p>
      )}
    </div>
  );
}
