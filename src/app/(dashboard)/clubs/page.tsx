import type { Metadata } from "next";
import { ClubList } from "@/components/clubs/club-list";
import { CreateClubForm } from "@/components/clubs/create-club-form";
import { PendingInvites } from "@/components/clubs/pending-invites";
import { LocalDemoApp } from "@/components/local/local-demo-app";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ClubInviteWithClub, ClubWithRole } from "@/lib/types/domain";

export const metadata: Metadata = {
  title: "Clubs"
};

export default async function ClubsPage() {
  if (!hasSupabaseEnv()) {
    return <LocalDemoApp />;
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const [{ data: memberships, error }, { data: pendingInvites, error: inviteError }] = await Promise.all([
    supabase
      .from("club_members")
      .select("role, clubs(id, name, description, created_at)")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("club_invites")
      .select("id, club_id, email, role, invited_by, status, created_at, accepted_at, clubs(id, name, description, created_at)")
      .eq("status", "pending")
      .ilike("email", user?.email ?? "")
      .order("created_at", { ascending: false })
  ]);

  if (error || inviteError) {
    throw new Error(error?.message ?? inviteError?.message ?? "Could not load clubs.");
  }

  const clubs = ((memberships ?? []) as Array<{ role: ClubWithRole["role"]; clubs: ClubWithRole | ClubWithRole[] | null }>)
    .map((membership) => {
      const club = Array.isArray(membership.clubs) ? membership.clubs[0] : membership.clubs;
      return club ? ({ ...club, role: membership.role } as ClubWithRole) : null;
    })
    .filter((club): club is ClubWithRole => Boolean(club));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">Your clubs</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Manage club projects, member roles, task boards, meeting notes, and visual planning.
          </p>
        </div>
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-950">Club workspaces</h2>
          <ClubList clubs={clubs} />
        </section>
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-950">Pending invites</h2>
          <PendingInvites invites={(pendingInvites ?? []) as unknown as ClubInviteWithClub[]} />
        </section>
      </section>
      <CreateClubForm />
    </div>
  );
}
