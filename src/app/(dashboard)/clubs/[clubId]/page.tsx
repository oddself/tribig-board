import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, FileText, PenTool, Settings, Users } from "lucide-react";
import { MemberPanel } from "@/components/clubs/member-panel";
import { LocalDemoApp } from "@/components/local/local-demo-app";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { ProjectList } from "@/components/projects/project-list";
import { Badge } from "@/components/ui/badge";
import { LinkButton, buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { canEdit, canManageMembers, roleLabels } from "@/lib/permissions";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Club, ClubInvite, ClubMember, ClubRole, Profile, Project } from "@/lib/types/domain";

export const metadata: Metadata = {
  title: "Club"
};

type PageProps = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const tabs = ["overview", "projects", "members", "settings"] as const;
type ClubTab = (typeof tabs)[number];

export default async function ClubPage({ params, searchParams }: PageProps) {
  if (!hasSupabaseEnv()) {
    return <LocalDemoApp />;
  }

  const { clubId } = await params;
  const selectedTab = normalizeTab((await searchParams).tab);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: club, error: clubError }, { data: membership, error: roleError }] = await Promise.all([
    supabase.from("clubs").select("id, name, description, created_at").eq("id", clubId).maybeSingle(),
    supabase.from("club_members").select("role").eq("club_id", clubId).eq("user_id", user?.id).maybeSingle()
  ]);

  if (clubError || roleError) {
    throw new Error(clubError?.message ?? roleError?.message ?? "Could not load club.");
  }

  if (!club || !membership) {
    notFound();
  }

  const role = membership.role as ClubRole;
  const userCanEdit = canEdit(role);
  const userCanManageMembers = canManageMembers(role);

  const [
    { data: projects, error: projectsError },
    { data: members, error: membersError },
    { data: invites, error: invitesError }
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, club_id, name, description, created_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false }),
    supabase
      .from("club_members")
      .select("id, club_id, user_id, role, profiles:profiles!club_members_user_id_fkey(id, email, full_name)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: true }),
    supabase
      .from("club_invites")
      .select("id, club_id, email, role, invited_by, status, created_at, accepted_at")
      .eq("club_id", clubId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
  ]);

  if (projectsError || membersError || invitesError) {
    throw new Error(projectsError?.message ?? membersError?.message ?? invitesError?.message ?? "Could not load club workspace.");
  }

  const normalizedMembers = ((members ?? []) as unknown as Array<ClubMember & { profiles: Profile | Profile[] | null }>).map(
    (member) => ({
      ...member,
      role: member.role as ClubRole,
      profiles: Array.isArray(member.profiles) ? (member.profiles[0] ?? null) : member.profiles
    })
  );
  const normalizedProjects = (projects ?? []) as Project[];
  const currentClub = club as Club;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <LinkButton href="/clubs" variant="ghost" size="sm" className="-ml-3">
            <ArrowLeft size={16} />
            Clubs
          </LinkButton>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">Current club: {currentClub.name}</h1>
            <Badge variant="teal">{roleLabels[role]}</Badge>
          </div>
          <p className="mt-2 max-w-3xl text-slate-600">{currentClub.description || "No description yet."}</p>
        </div>
      </div>

      <ClubTabs clubId={clubId} activeTab={selectedTab} />

      {selectedTab === "overview" ? (
        <ClubOverview clubId={clubId} projects={normalizedProjects} members={normalizedMembers} role={role} />
      ) : null}

      {selectedTab === "projects" ? (
        <section className="space-y-5">
          {userCanEdit ? <CreateProjectForm clubId={clubId} /> : null}
          <ProjectList clubId={clubId} projects={normalizedProjects} />
        </section>
      ) : null}

      {selectedTab === "members" ? (
        <MemberPanel
          clubId={clubId}
          members={normalizedMembers}
          invites={(invites ?? []) as ClubInvite[]}
          canManage={userCanManageMembers}
        />
      ) : null}

      {selectedTab === "settings" ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-950">Settings</h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Club settings are intentionally minimal in this MVP. Role-based access is active for this workspace.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function normalizeTab(tab?: string): ClubTab {
  return tabs.includes(tab as ClubTab) ? (tab as ClubTab) : "overview";
}

function ClubTabs({ clubId, activeTab }: { clubId: string; activeTab: ClubTab }) {
  const items: Array<{ id: ClubTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "projects", label: "Projects" },
    { id: "members", label: "Members" },
    { id: "settings", label: "Settings" }
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/clubs/${clubId}?tab=${item.id}`}
          className={buttonClassName(activeTab === item.id ? "primary" : "secondary", "sm")}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function ClubOverview({
  clubId,
  projects,
  members,
  role
}: {
  clubId: string;
  projects: Project[];
  members: ClubMember[];
  role: ClubRole;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard icon={<ClipboardList size={18} />} label="Projects" value={projects.length} />
          <SummaryCard icon={<Users size={18} />} label="Members" value={members.length} />
          <SummaryCard label="Your role" value={roleLabels[role]} />
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Projects</h2>
          {projects.length > 0 ? (
            <div className="mt-4 space-y-3">
              {projects.slice(0, 4).map((project) => (
                <div
                  key={project.id}
                  className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-950">{project.name}</h3>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-600">{project.description || "No description yet."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <LinkButton href={`/clubs/${clubId}/projects/${project.id}`} variant="secondary" size="sm">
                      <ClipboardList size={14} />
                      Tasks
                    </LinkButton>
                    <LinkButton href={`/clubs/${clubId}/projects/${project.id}/notes`} variant="ghost" size="sm">
                      <FileText size={14} />
                      Notes
                    </LinkButton>
                    <LinkButton href={`/clubs/${clubId}/projects/${project.id}/board`} variant="ghost" size="sm">
                      <PenTool size={14} />
                      Board
                    </LinkButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No projects yet"
              description="Create a project from the Projects tab to start tasks, notes, and visual planning."
            />
          )}
        </section>
      </section>

      <MemberPanel clubId={clubId} members={members} canManage={false} />
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon?: ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
