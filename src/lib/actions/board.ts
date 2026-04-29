"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProjectEditor, requireUser } from "@/lib/actions/helpers";

export async function saveBoardScene(projectId: string, sceneJson: unknown) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await requireProjectEditor(supabase, projectId, user.id);

  const { error } = await supabase.from("project_boards").upsert({
    project_id: projectId,
    scene_json: sceneJson ?? {},
    updated_by: user.id,
    updated_at: new Date().toISOString()
  });

  if (error) {
    throw new Error(error.message);
  }
}
