import { Plus } from "lucide-react";
import { createProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function CreateProjectForm({ clubId }: { clubId: string }) {
  const createProjectForClub = createProject.bind(null, clubId);

  return (
    <form action={createProjectForClub} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Create project</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
        <div className="space-y-2">
          <Label htmlFor="project-name">Name</Label>
          <Input id="project-name" name="name" placeholder="Spring Tech Summit" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="project-description">Description</Label>
          <Input id="project-description" name="description" placeholder="Planning, logistics, speakers" />
        </div>
        <Button type="submit">
          <Plus size={16} />
          Create
        </Button>
      </div>
    </form>
  );
}
