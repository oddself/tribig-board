import { MailCheck } from "lucide-react";
import { acceptClubInvite } from "@/lib/actions/clubs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { roleLabels } from "@/lib/permissions";
import type { ClubInviteWithClub } from "@/lib/types/domain";

export function PendingInvites({ invites }: { invites: ClubInviteWithClub[] }) {
  if (invites.length === 0) {
    return (
      <EmptyState
        title="No pending invites"
        description="Club invites sent to your email will appear here after you sign in."
      />
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((invite) => {
        const acceptInvite = acceptClubInvite.bind(null, invite.id);

        return (
          <article key={invite.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <MailCheck size={16} className="text-teal-700" />
                  <h3 className="truncate text-lg font-semibold text-slate-950">
                    {invite.clubs?.name ?? "Club invite"}
                  </h3>
                  <Badge variant="amber">{roleLabels[invite.role]}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Invited as {roleLabels[invite.role]} for {invite.email}.
                </p>
              </div>
              <form action={acceptInvite}>
                <Button type="submit">Accept invite</Button>
              </form>
            </div>
          </article>
        );
      })}
    </div>
  );
}
