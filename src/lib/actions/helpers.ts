import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";
import type { ClubRole } from "@/lib/types/domain";
import { canEdit, canManageMembers } from "@/lib/permissions";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function requireUser(supabase: SupabaseServerClient) {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("You must be signed in to do that.");
  }

  await ensureProfile(supabase, user);
  return user;
}

export async function ensureProfile(supabase: SupabaseServerClient, user: User) {
  const email = user.email ?? "";
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email,
    full_name: fullName
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getClubRole(supabase: SupabaseServerClient, clubId: string, userId: string) {
  const { data, error } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.role as ClubRole | undefined;
}

export async function requireClubEditor(supabase: SupabaseServerClient, clubId: string, userId: string) {
  const role = await getClubRole(supabase, clubId, userId);

  if (!canEdit(role)) {
    throw new Error("You do not have permission to edit this club.");
  }

  return role;
}

export async function requireClubManager(supabase: SupabaseServerClient, clubId: string, userId: string) {
  const role = await getClubRole(supabase, clubId, userId);

  if (!canManageMembers(role)) {
    throw new Error("You do not have permission to manage members.");
  }

  return role;
}

export async function getProjectForPermission(supabase: SupabaseServerClient, projectId: string) {
  const { data, error } = await supabase.from("projects").select("id, club_id").eq("id", projectId).single();

  if (error || !data) {
    throw new Error(error?.message ?? "Project not found.");
  }

  return data as { id: string; club_id: string };
}

export async function requireProjectEditor(supabase: SupabaseServerClient, projectId: string, userId: string) {
  const project = await getProjectForPermission(supabase, projectId);
  await requireClubEditor(supabase, project.club_id, userId);
  return project;
}

export async function assertMemberBelongsToClub(
  supabase: SupabaseServerClient,
  clubId: string,
  assignedTo: string | null
) {
  if (!assignedTo) {
    return;
  }

  const { data, error } = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", assignedTo)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Assigned user must be a member of this club.");
  }
}

export function readFormString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}
