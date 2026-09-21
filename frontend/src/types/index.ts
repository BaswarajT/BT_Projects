export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Project {
  id: number;
  name: string;
  code: string;
  description: string;
  owner: number;
  owner_name: string;
  company: number | null;
  company_name: string | null;
  pmo_name: string;
  region: string;
  state: string;
  priority: ProjectPriority;
  budget: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Task {
  id: number;
  project: number;
  title: string;
  description: string;
  assigned_to: number | null;
  assigned_to_name: string | null;
  created_by: number;
  created_by_name: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: string;
  actual_hours: string;
  parent_task: number | null;
  created_at: string;
  updated_at: string;
}

export type Gender = "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED";
export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "PROJECT_MANAGER"
  | "TEAM_LEAD"
  | "MEMBER"
  | "CLIENT"
  | "VIEWER";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Company Admin",
  PROJECT_MANAGER: "Project Manager",
  TEAM_LEAD: "Team Lead",
  MEMBER: "Member",
  CLIENT: "Client",
  VIEWER: "Viewer",
};

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: Role;
  company: number | null;
  company_name: string | null;
  phone: string;
  avatar: string | null;
  gender: Gender | "";
  country: string;
  dial_code: string | null;
  state: string;
  language: string;
  timezone: string;
  job_title: string;
  department: string;
  bio: string;
  website: string;
  email_verified: boolean;
  phone_verified: boolean;
  is_active: boolean;
}

export interface Company {
  id: number;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
  created_by: number | null;
  created_by_name: string | null;
  user_count: number;
  project_count: number;
}

export interface Milestone {
  id: number;
  title: string;
  due_date: string;
  project_name: string;
}

export interface ProjectProgress {
  id: number;
  name: string;
  code: string;
  status: ProjectStatus;
  total_tasks: number;
  completed_tasks: number;
  percent_complete: number;
}

export interface TeamWorkload {
  id: number;
  username: string;
  open_task_count: number;
}

export interface DashboardSummary {
  total_projects: number;
  open_tasks: number;
  completed_tasks: number;
  overdue_tasks: number;
  blocked_tasks: number;
  upcoming_milestones: Milestone[];
  project_progress: ProjectProgress[];
  team_workload: TeamWorkload[];
}
