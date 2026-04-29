"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, readFormString, requireClubManager, requireUser } from "@/lib/actions/helpers";
import type { ClubRole } from "@/lib/types/domain";

const inviteRoles: Array<Exclude<ClubRole, "owner">> = ["admin", "editor", "member", "guest"];

export async function createClub(formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const name = readFormString(formData, "name");
  const description = emptyToNull(readFormString(formData, "description"));

  if (!name) {
    throw new Error("Club name is required.");
  }

  const { data: club, error } = await supabase
    .from("clubs")
    .insert({ name, description, created_by: user.id })
    .select("id")
    .single();

  if (error || !club) {
    throw new Error(error?.message ?? "Could not create club.");
  }

  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: club.id,
    user_id: user.id,
    role: "owner"
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  revalidatePath("/clubs");
  redirect(`/clubs/${club.id}`);
}

export async function createClubInvite(clubId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await requireClubManager(supabase, clubId, user.id);

  const email = readFormString(formData, "email").toLowerCase();
  const role = readFormString(formData, "role") as Exclude<ClubRole, "owner">;

  if (!email || !inviteRoles.includes(role)) {
    throw new Error("Choose a valid invite email and role.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile) {
    const { data: existingMember, error: memberError } = await supabase
      .from("club_members")
      .select("id")
      .eq("club_id", clubId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (memberError) {
      throw new Error(memberError.message);
    }

    if (existingMember) {
      throw new Error("That user is already a member of this club.");
    }
  }

  const { error } = await supabase.from("club_invites").insert({
    club_id: clubId,
    email,
    role,
    invited_by: user.id
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/clubs/${clubId}`);
  revalidatePath("/clubs");
}

export async function acceptClubInvite(inviteId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const email = user.email?.toLowerCase();

  if (!email) {
    throw new Error("Your account needs an email address to accept invites.");
  }

  const { data: invite, error: inviteError } = await supabase
    .from("club_invites")
    .select("id, club_id, email, role, status")
    .eq("id", inviteId)
    .eq("status", "pending")
    .maybeSingle();

  if (inviteError || !invite) {
    throw new Error(inviteError?.message ?? "Invite not found.");
  }

  if (String(invite.email).toLowerCase() !== email) {
    throw new Error("This invite belongs to a different email address.");
  }

  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: invite.club_id,
    user_id: user.id,
    role: invite.role
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  const { error: updateError } = await supabase
    .from("club_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString()
    })
    .eq("id", invite.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/clubs");
  revalidatePath(`/clubs/${invite.club_id}`);
  redirect(`/clubs/${invite.club_id}`);
}
