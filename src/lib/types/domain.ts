export type ClubRole = "owner" | "admin" | "editor" | "member" | "guest";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
};

export type Club = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type ClubWithRole = Club & {
  role: ClubRole;
};

export type ClubMember = {
  id: string;
  club_id: string;
  user_id: string;
  role: ClubRole;
  profiles: Profile | null;
};

export type ClubInvite = {
  id: string;
  club_id: string;
  email: string;
  role: Exclude<ClubRole, "owner">;
  invited_by: string;
  status: "pending" | "accepted";
  created_at: string;
  accepted_at: string | null;
};

export type ClubInviteWithClub = ClubInvite & {
  clubs: Club | null;
};

export type Project = {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  profiles: Profile | null;
};

export type BoardScene = {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, unknown>;
};
