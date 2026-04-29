import { UserPlus } from "lucide-react";
import { createClubInvite } from "@/lib/actions/clubs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { roleLabels } from "@/lib/permissions";
import type { ClubInvite, ClubMember } from "@/lib/types/domain";

export function MemberPanel({
  clubId,
  members,
  invites = [],
  canManage
}: {
  clubId: string;
  members: ClubMember[];
  invites?: ClubInvite[];
  canManage: boolean;
}) {
  const inviteMember = createClubInvite.bind(null, clubId);

  return (
    <aside className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Members</h2>
        <div className="mt-4 space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {member.profiles?.full_name || member.profiles?.email || "Unknown member"}
                </p>
                <p className="truncate text-xs text-slate-500">{member.profiles?.email}</p>
              </div>
              <Badge variant={member.role === "owner" ? "amber" : "neutral"}>{roleLabels[member.role]}</Badge>
            </div>
          ))}
        </div>
      </section>

      {canManage ? (
        <form action={inviteMember} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Invite member</h2>
          <p className="mt-1 text-sm text-slate-600">Invited users join after signing in with this email.</p>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input id="member-email" name="email" type="email" placeholder="member@university.edu" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Role</Label>
              <Select id="member-role" name="role" defaultValue="member">
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="member">Member</option>
                <option value="guest">Guest</option>
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              <UserPlus size={16} />
              Send invite
            </Button>
          </div>
        </form>
      ) : null}

      {canManage ? (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Pending invites</h2>
          {invites.length > 0 ? (
            <div className="mt-4 space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{invite.email}</p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                  <Badge>{roleLabels[invite.role]}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              No pending invites.
            </p>
          )}
        </section>
      ) : null}
    </aside>
  );
}
