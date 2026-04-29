"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { CalendarDays, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { createTask, deleteTask, updateTask, updateTaskStatus } from "@/lib/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { priorityLabels, taskStatusLabels } from "@/lib/permissions";
import type { ClubMember, Task, TaskPriority, TaskStatus } from "@/lib/types/domain";

const statuses: TaskStatus[] = ["todo", "in_progress", "done"];
const priorities: TaskPriority[] = ["low", "medium", "high"];

const priorityVariant: Record<TaskPriority, "neutral" | "amber" | "rose"> = {
  low: "neutral",
  medium: "amber",
  high: "rose"
};

export function TaskBoard({
  projectId,
  tasks,
  members,
  canEdit
}: {
  projectId: string;
  tasks: Task[];
  members: ClubMember[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const groupedTasks = useMemo(
    () =>
      statuses.reduce<Record<TaskStatus, Task[]>>(
        (acc, status) => {
          acc[status] = tasks.filter((task) => task.status === status);
          return acc;
        },
        { todo: [], in_progress: [], done: [] }
      ),
    [tasks]
  );
  
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project-tasks-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
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

  async function refreshAfter(action: Promise<unknown>) {
    await action;
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {canEdit ? (
        <form
          action={(formData) => {
            startTransition(() => {
              void refreshAfter(createTask(projectId, formData));
            });
          }}
          className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-950">Create task</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr_9rem_12rem_10rem_auto] lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input id="task-title" name="title" placeholder="Confirm venue booking" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Input id="task-description" name="description" placeholder="Optional details" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Priority</Label>
              <Select id="task-priority" name="priority" defaultValue="medium">
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabels[priority]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-assigned">Assignee</Label>
              <MemberSelect id="task-assigned" name="assigned_to" members={members} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Due date</Label>
              <Input id="task-due" name="due_date" type="date" />
            </div>
            <input type="hidden" name="status" value="todo" />
            <Button type="submit" disabled={isPending}>
              <Plus size={16} />
              Add
            </Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {statuses.map((status) => (
          <section key={status} className="min-h-96 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">{taskStatusLabels[status]}</h2>
              <Badge>{groupedTasks[status].length}</Badge>
            </div>
            <div className="space-y-3">
              {groupedTasks[status].map((task) =>
                editingTaskId === task.id ? (
                  <TaskEditForm
                    key={task.id}
                    task={task}
                    members={members}
                    isPending={isPending}
                    onCancel={() => setEditingTaskId(null)}
                    onSubmit={(formData) => {
                      startTransition(() => {
                        void refreshAfter(updateTask(task.id, formData)).then(() => setEditingTaskId(null));
                      });
                    }}
                  />
                ) : (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canEdit={canEdit}
                    isPending={isPending}
                    onEdit={() => setEditingTaskId(task.id)}
                    onDelete={() => {
                      startTransition(() => {
                        void refreshAfter(deleteTask(task.id));
                      });
                    }}
                    onMove={(nextStatus) => {
                      startTransition(() => {
                        void refreshAfter(updateTaskStatus(task.id, nextStatus));
                      });
                    }}
                  />
                )
              )}
              {groupedTasks[status].length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 bg-white/70 px-3 py-6 text-center text-sm text-slate-500">
                  No tasks here.
                </p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  canEdit,
  isPending,
  onEdit,
  onDelete,
  onMove
}: {
  task: Task;
  canEdit: boolean;
  isPending: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: TaskStatus) => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold text-slate-950">{task.title}</h3>
          {task.description ? <p className="mt-2 break-words text-sm text-slate-600">{task.description}</p> : null}
        </div>
        <Badge variant={priorityVariant[task.priority]}>{priorityLabels[task.priority]}</Badge>
      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-500">
        <p>
          Assigned to{" "}
          <span className="font-semibold text-slate-700">
            {task.profiles?.full_name || task.profiles?.email || "Unassigned"}
          </span>
        </p>
        {task.due_date ? (
          <p className="flex items-center gap-1.5">
            <CalendarDays size={14} />
            {task.due_date}
          </p>
        ) : null}
      </div>

      {canEdit ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {statuses
            .filter((status) => status !== task.status)
            .map((status) => (
              <Button key={status} type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => onMove(status)}>
                {taskStatusLabels[status]}
              </Button>
            ))}
          <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={onEdit} aria-label="Edit task">
            <Pencil size={14} />
          </Button>
          <Button type="button" variant="danger" size="sm" disabled={isPending} onClick={onDelete} aria-label="Delete task">
            <Trash2 size={14} />
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function TaskEditForm({
  task,
  members,
  isPending,
  onCancel,
  onSubmit
}: {
  task: Task;
  members: ClubMember[];
  isPending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form action={onSubmit} className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`title-${task.id}`}>Title</Label>
          <Input id={`title-${task.id}`} name="title" defaultValue={task.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`description-${task.id}`}>Description</Label>
          <Textarea id={`description-${task.id}`} name="description" defaultValue={task.description ?? ""} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`status-${task.id}`}>Status</Label>
            <Select id={`status-${task.id}`} name="status" defaultValue={task.status}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {taskStatusLabels[status]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`priority-${task.id}`}>Priority</Label>
            <Select id={`priority-${task.id}`} name="priority" defaultValue={task.priority}>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`assigned-${task.id}`}>Assignee</Label>
            <MemberSelect id={`assigned-${task.id}`} name="assigned_to" members={members} defaultValue={task.assigned_to ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`due-${task.id}`}>Due date</Label>
            <Input id={`due-${task.id}`} name="due_date" type="date" defaultValue={task.due_date ?? ""} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          <Save size={14} />
          Save
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function MemberSelect({
  members,
  defaultValue = "",
  ...props
}: {
  members: ClubMember[];
  id: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <Select defaultValue={defaultValue} {...props}>
      <option value="">Unassigned</option>
      {members.map((member) => (
        <option key={member.user_id} value={member.user_id}>
          {member.profiles?.full_name || member.profiles?.email || member.user_id}
        </option>
      ))}
    </Select>
  );
}
