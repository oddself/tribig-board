import type { ClubRole } from "@/lib/types/domain";

export const roleLabels: Record<ClubRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  member: "Member",
  guest: "Guest"
};

export const taskStatusLabels = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done"
} as const;

export const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High"
} as const;

export function canEdit(role?: ClubRole | null) {
  return role === "owner" || role === "admin" || role === "editor";
}

export function canManageMembers(role?: ClubRole | null) {
  return role === "owner" || role === "admin";
}

export function canDeleteClub(role?: ClubRole | null) {
  return role === "owner";
}
