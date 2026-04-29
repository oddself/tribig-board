"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { readFormString, requireProjectEditor, requireUser } from "@/lib/actions/helpers";

export async function saveProjectNotes(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const project = await requireProjectEditor(supabase, projectId, user.id);
  const body = readFormString(formData, "body");

  const { error } = await supabase.from("project_notes").upsert({
    project_id: projectId,
    body,
    updated_by: user.id,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/clubs/${project.club_id}/projects/${projectId}`);
  revalidatePath(`/clubs/${project.club_id}/projects/${projectId}/notes`);
}
