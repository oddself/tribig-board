import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { roleLabels } from "@/lib/permissions";
import type { ClubWithRole } from "@/lib/types/domain";

export function ClubList({ clubs }: { clubs: ClubWithRole[] }) {
  if (clubs.length === 0) {
    return (
      <EmptyState
        title="No clubs yet"
        description="Create a club to start planning projects, tasks, notes, and visual boards."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {clubs.map((club) => (
        <Link
          key={club.id}
          href={`/clubs/${club.id}`}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-950">{club.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{club.description || "No description yet."}</p>
            </div>
            <Badge variant="teal">{roleLabels[club.role]}</Badge>
          </div>
          <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
            <Users size={16} />
            Club workspace
          </div>
        </Link>
      ))}
    </div>
  );
}
