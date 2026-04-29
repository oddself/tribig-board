import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { ExcalidrawBoard } from "@/components/board/excalidraw-board";
import { LocalDemoApp } from "@/components/local/local-demo-app";
import { LinkButton } from "@/components/ui/button";
import { canEdit } from "@/lib/permissions";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { BoardScene, ClubRole, Project } from "@/lib/types/domain";

export const metadata: Metadata = {
  title: "Visual board"
};

type PageProps = {
  params: Promise<{ clubId: string; projectId: string }>;
};

export default async function BoardPage({ params }: PageProps) {
  if (!hasSupabaseEnv()) {
    return <LocalDemoApp />;
  }

  const { clubId, projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [
    { data: project, error: projectError },
    { data: membership, error: membershipError },
    { data: board, error: boardError }
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, club_id, name, description, created_at")
      .eq("id", projectId)
      .eq("club_id", clubId)
      .maybeSingle(),
    supabase.from("club_members").select("role").eq("club_id", clubId).eq("user_id", user?.id).maybeSingle(),
    supabase.from("project_boards").select("scene_json").eq("project_id", projectId).maybeSingle()
  ]);

  if (projectError || membershipError || boardError) {
    throw new Error(projectError?.message ?? membershipError?.message ?? boardError?.message ?? "Could not load board.");
  }

  if (!project || !membership) {
    notFound();
  }

  const role = membership.role as ClubRole;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <LinkButton href={`/clubs/${clubId}/projects/${projectId}`} variant="ghost" size="sm" className="-ml-3">
            <ArrowLeft size={16} />
            Project
          </LinkButton>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">{(project as Project).name} board</h1>
          <p className="mt-2 text-slate-600">Sketch ideas, flows, layouts, and planning maps for this project.</p>
        </div>
        <LinkButton href={`/clubs/${clubId}/projects/${projectId}`} variant="secondary">
          <ClipboardList size={16} />
          Task board
        </LinkButton>
      </div>
      <ExcalidrawBoard projectId={projectId} initialScene={(board?.scene_json ?? {}) as BoardScene} canEdit={canEdit(role)} />
    </div>
  );
}
