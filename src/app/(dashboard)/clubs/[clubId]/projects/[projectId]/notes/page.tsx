import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, PenTool } from "lucide-react";
import { LocalDemoApp } from "@/components/local/local-demo-app";
import { NotesEditor } from "@/components/notes/notes-editor";
import { LinkButton } from "@/components/ui/button";
import { canEdit } from "@/lib/permissions";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ClubRole, Project } from "@/lib/types/domain";

export const metadata: Metadata = {
  title: "Meeting notes"
};

type PageProps = {
  params: Promise<{ clubId: string; projectId: string }>;
};

export default async function NotesPage({ params }: PageProps) {
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
    { data: notes, error: notesError }
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, club_id, name, description, created_at")
      .eq("id", projectId)
      .eq("club_id", clubId)
      .maybeSingle(),
    supabase.from("club_members").select("role").eq("club_id", clubId).eq("user_id", user?.id).maybeSingle(),
    supabase.from("project_notes").select("body").eq("project_id", projectId).maybeSingle()
  ]);

  if (projectError || membershipError || notesError) {
    throw new Error(projectError?.message ?? membershipError?.message ?? notesError?.message ?? "Could not load notes.");
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
          <h1 className="mt-3 text-3xl font-bold text-slate-950">{(project as Project).name} notes</h1>
          <p className="mt-2 text-slate-600">Capture decisions, owners, blockers, and next steps in markdown.</p>
        </div>
        <LinkButton href={`/clubs/${clubId}/projects/${projectId}/board`} variant="secondary">
          <PenTool size={16} />
          Visual board
        </LinkButton>
      </div>
      <NotesEditor projectId={projectId} initialBody={notes?.body ?? ""} canEdit={canEdit(role)} />
    </div>
  );
}
