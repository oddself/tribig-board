"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import ReactMarkdown from "react-markdown";
import { Save } from "lucide-react";
import { saveProjectNotes } from "@/lib/actions/notes";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";

export function NotesEditor({
  projectId,
  initialBody,
  canEdit
}: {
  projectId: string;
  initialBody: string;
  canEdit: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-notes-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_notes",
          filter: `project_id=eq.${projectId}`
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, router]);

  return <NotesEditorDraft key={`${projectId}:${initialBody}`} projectId={projectId} initialBody={initialBody} canEdit={canEdit} />;
}

function NotesEditorDraft({
  projectId,
  initialBody,
  canEdit
}: {
  projectId: string;
  initialBody: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        action={(formData) => {
          startTransition(() => {
            void saveProjectNotes(projectId, formData).then(() => router.refresh());
          });
        }}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-950">Meeting notes</h2>
          {canEdit ? (
            <Button type="submit" size="sm" disabled={isPending}>
              <Save size={14} />
              Save
            </Button>
          ) : null}
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="notes-body">Markdown</Label>
          <Textarea
            id="notes-body"
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            readOnly={!canEdit}
            className="min-h-[28rem] font-mono"
            placeholder="# Weekly meeting&#10;&#10;- Decisions&#10;- Owners&#10;- Next steps"
          />
        </div>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Preview</h2>
        <div className="markdown-preview mt-4 min-h-[28rem] rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {body ? <ReactMarkdown>{body}</ReactMarkdown> : <p className="text-slate-500">No notes yet.</p>}
        </div>
      </section>
    </div>
  );
}
