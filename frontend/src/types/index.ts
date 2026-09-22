export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type ProjectPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ProjectTypeTag = "MRA" | "NON_MRA" | "";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Ongoing",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const PROJECT_TYPE_LABELS: Record<ProjectTypeTag, string> = {
  MRA: "MRA",
  NON_MRA: "Non MRA",
  "": "—",
};

export interface Project {
  id: number;
  name: string;
  code: string;
  description: string;
  owner: number;
  owner_name: string;
  company: number | null;
  company_name: string | null;
  client: number | null;
  client_name: string | null;
  pmo_name: string;
  pmo: number | null;
  pmo_owner_name: string | null;
  region: string;
  state: string;
  priority: ProjectPriority;
  budget: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;

  percent_complete: number;
  project_group: string;
  created_by: number | null;
  created_by_name: string | null;
  completion_date: string | null;
  unique_order_id: string;
  po_status: string;
  po_number: string;
  currency: string;
  po_value: string | null;
  man_days: number | null;
  sales_person: number | null;
  sales_person_name: string | null;
  category_a: string;
  category_b: string;
  contract_type: string;
  comments: string;
  project_comments: string;
  overrun_comments: string;
  po_date: string | null;
  billing_entity: string;
  budget_type: string;
  working_emp: string;
  lob_head: number | null;
  lob_head_name: string | null;
  delivery_leads: string;
  project_type: ProjectTypeTag;
  completion_status: ProjectStatus | "";
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
  | "GLOBAL_ADMIN"
  | "SUPER_ADMIN"
  | "ADMIN"
  | "SALES_MANAGER"
  | "PROJECT_MANAGER"
  | "SALESPERSON"
  | "TEAM_LEAD"
  | "MEMBER"
  | "CLIENT"
  | "VIEWER";

export const ROLE_LABELS: Record<Role, string> = {
  GLOBAL_ADMIN: "Global Admin",
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SALES_MANAGER: "Sales Manager",
  PROJECT_MANAGER: "Project Manager",
  SALESPERSON: "Salesperson",
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
  deleted_at?: string | null;
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

export interface TimeEntry {
  id: number;
  task: number;
  task_title: string;
  project: number;
  project_name: string;
  user: number;
  user_name: string;
  date: string;
  hours: string;
  note: string;
  logged_at: string;
}

export type UtilizationStatus = "BENCH" | "UNDER_UTILIZED" | "UTILIZED" | "OVER_ALLOCATED";

export const UTILIZATION_LABELS: Record<UtilizationStatus, string> = {
  BENCH: "Bench",
  UNDER_UTILIZED: "Under-utilized",
  UTILIZED: "Utilized",
  OVER_ALLOCATED: "Over-allocated",
};

export interface ResourceUtilization {
  id: number;
  username: string;
  full_name: string;
  company_name: string | null;
  weekly_capacity_hours: number;
  capacity_hours: number;
  logged_hours: number;
  utilization_pct: number;
  status: UtilizationStatus;
  active_assignments: number;
  available_from: string | null;
}

export interface ResourceUtilizationReport {
  start_date: string;
  end_date: string;
  resources: ResourceUtilization[];
  bench_count: number;
}

export type ScheduleStatus = "ON_TRACK" | "OVER_BUDGET" | "OVERDUE" | "COMPLETED" | "CANCELLED";

export const SCHEDULE_LABELS: Record<ScheduleStatus, string> = {
  ON_TRACK: "On Track",
  OVER_BUDGET: "Over Budget",
  OVERDUE: "Overdue",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export interface ProjectOverrun {
  id: number;
  name: string;
  code: string;
  status: ProjectStatus;
  company_name: string | null;
  estimated_hours: number;
  actual_hours: number;
  overrun_pct: number;
  end_date: string | null;
  is_overdue: boolean;
  schedule_status: ScheduleStatus;
}

export interface ProjectOverrunReport {
  projects: ProjectOverrun[];
}

export type ClientStatus = "ACTIVE" | "INACTIVE";

export interface Client {
  id: number;
  company: number | null;
  company_name: string | null;
  name: string;
  code: string;
  industry: string;
  website: string;
  country: string;
  state: string;
  city: string;
  address: string;
  primary_contact_name: string;
  contact_email: string;
  contact_phone: string;
  account_manager: number | null;
  account_manager_name: string | null;
  salesperson: number | null;
  salesperson_name: string | null;
  status: ClientStatus;
  notes: string;
  total_deals: number;
  won_deals: number;
  active_projects: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export type DealStage =
  | "NEW"
  | "QUALIFICATION"
  | "DISCOVERY"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "HOLD"
  | "WON"
  | "LOST"
  | "CANCELLED";

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  NEW: "New",
  QUALIFICATION: "Qualification",
  DISCOVERY: "Discovery",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  HOLD: "Hold",
  WON: "Won",
  LOST: "Lost",
  CANCELLED: "Cancelled",
};

export const OPEN_DEAL_STAGES: DealStage[] = [
  "NEW", "QUALIFICATION", "DISCOVERY", "PROPOSAL", "NEGOTIATION", "HOLD",
];

export interface SalesProject {
  id: number;
  company: number | null;
  company_name: string | null;
  name: string;
  client: number;
  client_name: string;
  client_contact: string;
  salesperson: number;
  salesperson_name: string;
  sales_manager: number | null;
  sales_manager_name: string | null;
  presales_owner: number | null;
  presales_owner_name: string | null;
  pmo: number | null;
  pmo_name: string | null;
  project_manager: number | null;
  project_manager_name: string | null;
  stage: DealStage;
  priority: ProjectPriority;
  amount: string;
  currency: string;
  probability: number;
  weighted_amount: number;
  region: string;
  lead_source: string;
  solution: string;
  technology: string;
  competitor: string;
  decision_maker: string;
  next_action: string;
  next_action_date: string | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  expected_close_date: string | null;
  notes: string;
  linked_project: number | null;
  linked_project_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesTeamMember {
  id: number;
  username: string;
  full_name: string;
  role: Role;
  region: string;
  target: number | null;
  pipeline_value: number;
  active_deals: number;
  won_value: number;
  won_deals: number;
  lost_value: number;
  hold_value: number;
  win_rate: number;
  achievement_pct: number | null;
}

export interface SalesTeamPerformanceReport {
  team: SalesTeamMember[];
}
