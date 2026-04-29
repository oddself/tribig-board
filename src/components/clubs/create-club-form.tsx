import { Plus } from "lucide-react";
import { createClub } from "@/lib/actions/clubs";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

export function CreateClubForm() {
  return (
    <form action={createClub} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-950">Create club</h2>
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="club-name">Name</Label>
          <Input id="club-name" name="name" placeholder="Robotics Club" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="club-description">Description</Label>
          <Textarea id="club-description" name="description" placeholder="What does this club work on?" />
        </div>
        <Button type="submit">
          <Plus size={16} />
          Create club
        </Button>
      </div>
    </form>
  );
}
