"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { emptyToNull, readFormString, requireClubEditor, requireUser } from "@/lib/actions/helpers";

export async function createProject(clubId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await requireClubEditor(supabase, clubId, user.id);

  const name = readFormString(formData, "name");
  const description = emptyToNull(readFormString(formData, "description"));

  if (!name) {
    throw new Error("Project name is required.");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ club_id: clubId, name, description, created_by: user.id })
    .select("id")
    .single();

  if (error || !project) {
    throw new Error(error?.message ?? "Could not create project.");
  }

  const [{ error: boardError }, { error: noteError }] = await Promise.all([
    supabase.from("project_boards").insert({ project_id: project.id, updated_by: user.id }),
    supabase.from("project_notes").insert({ project_id: project.id, updated_by: user.id })
  ]);

  if (boardError || noteError) {
    throw new Error(boardError?.message ?? noteError?.message ?? "Could not initialize project workspace.");
  }

  revalidatePath(`/clubs/${clubId}`);
  redirect(`/clubs/${clubId}/projects/${project.id}`);
}
