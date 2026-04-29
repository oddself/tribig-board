import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, PenTool } from "lucide-react";
import { LocalDemoApp } from "@/components/local/local-demo-app";
import { TaskBoard } from "@/components/tasks/task-board";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { canEdit, roleLabels } from "@/lib/permissions";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Club, ClubMember, ClubRole, Profile, Project, Task } from "@/lib/types/domain";

export const metadata: Metadata = {
  title: "Project"
};

type PageProps = {
  params: Promise<{ clubId: string; projectId: string }>;
};

export default async function ProjectPage({ params }: PageProps) {
  if (!hasSupabaseEnv()) {
    return <LocalDemoApp />;
  }

  const { clubId, projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [
    { data: club, error: clubError },
    { data: project, error: projectError },
    { data: membership, error: membershipError }
  ] = await Promise.all([
    supabase.from("clubs").select("id, name, description, created_at").eq("id", clubId).maybeSingle(),
    supabase
      .from("projects")
      .select("id, club_id, name, description, created_at")
      .eq("id", projectId)
      .eq("club_id", clubId)
      .maybeSingle(),
    supabase.from("club_members").select("role").eq("club_id", clubId).eq("user_id", user?.id).maybeSingle()
  ]);

  if (clubError || projectError || membershipError) {
    throw new Error(clubError?.message ?? projectError?.message ?? membershipError?.message ?? "Could not load project.");
  }

  if (!club || !project || !membership) {
    notFound();
  }

  const role = membership.role as ClubRole;
  const userCanEdit = canEdit(role);

  const [{ data: tasks, error: tasksError }, { data: members, error: membersError }, { data: note }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, project_id, title, description, status, priority, assigned_to, due_date, created_at, profiles:profiles!tasks_assigned_to_fkey(id, email, full_name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("club_members")
        .select("id, club_id, user_id, role, profiles:profiles!club_members_user_id_fkey(id, email, full_name)")
        .eq("club_id", clubId)
        .order("created_at", { ascending: true }),
      supabase.from("project_notes").select("body").eq("project_id", projectId).maybeSingle()
    ]);

  if (tasksError || membersError) {
    throw new Error(tasksError?.message ?? membersError?.message ?? "Could not load project workspace.");
  }

  const normalizedTasks = ((tasks ?? []) as unknown as Array<Task & { profiles: Profile | Profile[] | null }>).map((task) => ({
    ...task,
    profiles: Array.isArray(task.profiles) ? (task.profiles[0] ?? null) : task.profiles
  })) as Task[];

  const normalizedMembers = ((members ?? []) as unknown as Array<ClubMember & { profiles: Profile | Profile[] | null }>).map(
    (member) => ({
      ...member,
      role: member.role as ClubRole,
      profiles: Array.isArray(member.profiles) ? (member.profiles[0] ?? null) : member.profiles
    })
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <LinkButton href={`/clubs/${clubId}`} variant="ghost" size="sm" className="-ml-3">
            <ArrowLeft size={16} />
            {(club as Club).name}
          </LinkButton>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">{(project as Project).name}</h1>
            <Badge variant="teal">{roleLabels[role]}</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-slate-600">{(project as Project).description || "No description yet."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/clubs/${clubId}/projects/${projectId}/board`} variant="secondary">
            <PenTool size={16} />
            Visual board
          </LinkButton>
          <LinkButton href={`/clubs/${clubId}/projects/${projectId}/notes`} variant="secondary">
            <FileText size={16} />
            Notes
          </LinkButton>
        </div>
      </div>

      <TaskBoard
        projectId={projectId}
        tasks={normalizedTasks}
        members={normalizedMembers}
        canEdit={userCanEdit}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Latest notes</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{note?.body || "No meeting notes yet."}</p>
          </div>
          <LinkButton href={`/clubs/${clubId}/projects/${projectId}/notes`} variant="ghost" size="sm">
            Open notes
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
