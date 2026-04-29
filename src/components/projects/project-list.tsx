import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { Project } from "@/lib/types/domain";

export function ProjectList({ clubId, projects }: { clubId: string; projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Create a project to unlock the kanban board, meeting notes, and Excalidraw workspace."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/clubs/${clubId}/projects/${project.id}`}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <ClipboardList size={18} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-950">{project.name}</h2>
              <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                {project.description || "No description yet."}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
