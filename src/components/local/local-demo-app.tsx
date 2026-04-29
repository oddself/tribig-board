"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  CalendarDays,
  ClipboardList,
  FileText,
  PanelLeft,
  PenTool,
  Plus,
  RotateCcw,
  Save,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  getDefaultSelection,
  normalizeLocalDemoData,
  normalizeLocalSelection,
  seedLocalDemoData,
  type LocalDemoData,
  type LocalDemoPayload,
  type LocalMember,
  type LocalProject,
  type LocalSelection,
  type LocalTask
} from "@/lib/local-demo";
import { priorityLabels, roleLabels, taskStatusLabels } from "@/lib/permissions";
import type { BoardScene, TaskPriority, TaskStatus } from "@/lib/types/domain";
import type { AppState, BinaryFiles, ExcalidrawInitialDataState } from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const Excalidraw = dynamic(() => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-slate-500">Board yükleniyor...</div>
});

const SYNC_ENDPOINT = "/api/local-demo";
const POLL_INTERVAL_MS = 1000;
const statuses: TaskStatus[] = ["todo", "in_progress", "done"];
const priorities: TaskPriority[] = ["low", "medium", "high"];

type LocalView = "tasks" | "board" | "notes";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function submitLocalForm(
  event: React.FormEvent<HTMLFormElement>,
  handler: (formData: FormData) => void,
  resetAfterSubmit = true
) {
  event.preventDefault();
  const form = event.currentTarget;
  handler(new FormData(form));

  if (resetAfterSubmit) {
    form.reset();
  }
}

function isEditingFormField() {
  if (typeof document === "undefined") {
    return false;
  }

  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement
  );
}

export function LocalDemoApp() {
  const [data, setData] = useState<LocalDemoData>(seedLocalDemoData);
  const [selection, setSelection] = useState<LocalSelection>(() => getDefaultSelection(seedLocalDemoData));
  const [view, setView] = useState<LocalView>("tasks");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncLabel, setSyncLabel] = useState("Syncing...");
  const pendingWritesRef = useRef(0);
  const lastSyncedAtRef = useRef("");

  const applyPayload = useCallback((payload: LocalDemoPayload) => {
    const nextData = normalizeLocalDemoData(payload.data);

    setData(nextData);
    setSelection((current) => normalizeLocalSelection(nextData, current));
    lastSyncedAtRef.current = payload.updatedAt;
    setSyncLabel("Synced");
    setIsLoaded(true);
  }, []);

  const loadSharedData = useCallback(async () => {
    const response = await fetch(SYNC_ENDPOINT, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load shared local demo data.");
    }

    const payload = (await response.json()) as LocalDemoPayload;
    if (isEditingFormField()) {
      setIsLoaded(true);
      return;
    }

    if (payload.updatedAt !== lastSyncedAtRef.current && pendingWritesRef.current === 0) {
      applyPayload(payload);
    } else {
      setIsLoaded(true);
    }
  }, [applyPayload]);

  const saveSharedData = useCallback(async (nextData: LocalDemoData) => {
    pendingWritesRef.current += 1;
    setSyncLabel("Saving...");

    try {
      const response = await fetch(SYNC_ENDPOINT, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: nextData })
      });

      if (!response.ok) {
        throw new Error("Could not save shared local demo data.");
      }

      const payload = (await response.json()) as LocalDemoPayload;
      lastSyncedAtRef.current = payload.updatedAt;
      setSyncLabel("Synced");
    } catch {
      setSyncLabel("Sync failed");
    } finally {
      pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      loadSharedData().catch(() => {
        setIsLoaded(true);
        setSyncLabel("Sync failed");
      });
    });

    const interval = window.setInterval(() => {
      loadSharedData().catch(() => setSyncLabel("Sync failed"));
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [loadSharedData]);

  const activeClub = data.clubs.find((club) => club.id === selection.activeClubId) ?? data.clubs[0];
  const activeProject =
    activeClub?.projects.find((project) => project.id === selection.activeProjectId) ?? activeClub?.projects[0];

  const updateData = useCallback(
    (updater: (current: LocalDemoData) => LocalDemoData) => {
      setData((current) => {
        const nextData = normalizeLocalDemoData(updater(current));
        // We trigger the save as a separate microtask to ensure it happens after 
        // the state update and doesn't interfere with the render phase.
        queueMicrotask(() => void saveSharedData(nextData));
        return nextData;
      });
    },
    [saveSharedData]
  );


  function createClub(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) {
      return;
    }

    const clubId = createId("club");
    const projectId = createId("project");

    setSelection({
      activeClubId: clubId,
      activeProjectId: projectId
    });

    updateData((current) => ({
      clubs: [
        ...current.clubs,
        {
          id: clubId,
          name,
          description,
          members: [
            {
              id: createId("member"),
              fullName: "Local Demo User",
              email: "local.demo@tribig.app",
              role: "owner"
            }
          ],
          projects: [
            {
              id: projectId,
              clubId,
              name: "First project",
              description: "Local project workspace",
              tasks: [],
              notes: "",
              boardScene: {}
            }
          ]
        }
      ]
    }));
  }

  function createProject(formData: FormData) {
    if (!activeClub) {
      return;
    }

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();

    if (!name) {
      return;
    }

    const projectId = createId("project");

    setSelection((current) => ({
      ...current,
      activeProjectId: projectId
    }));

    updateData((current) => ({
      clubs: current.clubs.map((club) =>
        club.id === activeClub.id
          ? {
              ...club,
              projects: [
                ...club.projects,
                {
                  id: projectId,
                  clubId: club.id,
                  name,
                  description,
                  tasks: [],
                  notes: "",
                  boardScene: {}
                }
              ]
            }
          : club
      )
    }));
  }

  function createTask(formData: FormData) {
    if (!activeClub || !activeProject) {
      return;
    }

    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      return;
    }

    const nextTask: LocalTask = {
      id: createId("task"),
      title,
      description: String(formData.get("description") ?? "").trim(),
      status: "todo",
      priority: normalizePriority(String(formData.get("priority") ?? "medium")),
      assignedTo: String(formData.get("assignedTo") ?? ""),
      dueDate: String(formData.get("dueDate") ?? "")
    };

    updateProject(activeClub.id, activeProject.id, (project) => ({
      ...project,
      tasks: [nextTask, ...project.tasks]
    }));
  }

  function updateTask(taskId: string, formData: FormData) {
    if (!activeClub || !activeProject) {
      return;
    }

    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      return;
    }

    updateProject(activeClub.id, activeProject.id, (project) => ({
      ...project,
      tasks: project.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              title,
              description: String(formData.get("description") ?? "").trim(),
              status: normalizeStatus(String(formData.get("status") ?? task.status)),
              priority: normalizePriority(String(formData.get("priority") ?? task.priority)),
              assignedTo: String(formData.get("assignedTo") ?? ""),
              dueDate: String(formData.get("dueDate") ?? "")
            }
          : task
      )
    }));
    setEditingTaskId(null);
  }

  function updateTaskStatus(taskId: string, status: TaskStatus) {
    if (!activeClub || !activeProject) {
      return;
    }

    updateProject(activeClub.id, activeProject.id, (project) => ({
      ...project,
      tasks: project.tasks.map((task) => (task.id === taskId ? { ...task, status } : task))
    }));
  }

  function deleteTask(taskId: string) {
    if (!activeClub || !activeProject) {
      return;
    }

    updateProject(activeClub.id, activeProject.id, (project) => ({
      ...project,
      tasks: project.tasks.filter((task) => task.id !== taskId)
    }));
  }

  function saveNotes(notes: string) {
    if (!activeClub || !activeProject) {
      return;
    }

    updateProject(activeClub.id, activeProject.id, (project) => ({
      ...project,
      notes
    }));
  }

  function saveBoardScene(scene: BoardScene) {
    if (!activeClub || !activeProject) {
      return;
    }

    updateProject(activeClub.id, activeProject.id, (project) => ({
      ...project,
      boardScene: scene
    }));
  }

  function updateProject(clubId: string, projectId: string, updater: (project: LocalProject) => LocalProject) {
    updateData((current) => ({
      clubs: current.clubs.map((club) =>
        club.id === clubId
          ? {
              ...club,
              projects: club.projects.map((project) => (project.id === projectId ? updater(project) : project))
            }
          : club
      )
    }));
  }

  function resetDemo() {
    setEditingTaskId(null);
    setView("tasks");
    setSyncLabel("Resetting...");

    fetch(SYNC_ENDPOINT, { method: "DELETE" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not reset local demo data.");
        }

        return response.json() as Promise<LocalDemoPayload>;
      })
      .then((payload) => {
        applyPayload(payload);
        setSelection(getDefaultSelection(payload.data));
      })
      .catch(() => setSyncLabel("Sync failed"));
  }

  if (!isLoaded) {
    return <EmptyState title="Ortak veri yukleniyor" description="Yerel agdaki paylasilan demo verisi hazirlaniyor." />;
  }

  if (!activeClub || !activeProject) {
    return (
      <EmptyState
        title="Local veri hazır değil"
        description="Demo verisini sıfırlayarak tekrar başlayabilirsiniz."
        action={
          <Button type="button" onClick={resetDemo}>
            <RotateCcw size={16} />
            Demo verisini sıfırla
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-teal-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Local demo mode</p>
              <Badge variant="amber">shared LAN data</Badge>
              <Badge>{syncLabel}</Badge>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Tribig Board</h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Supabase env tanimli olmadigi icin veri bu bilgisayardaki Next server uzerinde ortak tutuluyor. Ayni
              yerel agdaki kullanicilar degisiklikleri kisa araliklarla gorur.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={resetDemo}>
            <RotateCcw size={16} />
            Demo verisini sıfırla
          </Button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[20rem_1fr]">
        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <PanelLeft size={16} />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Clubs</h2>
            </div>
            <div className="space-y-2">
              {data.clubs.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  onClick={() =>
                    setSelection({
                      activeClubId: club.id,
                      activeProjectId: club.projects[0]?.id ?? ""
                    })
                  }
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    club.id === activeClub.id
                      ? "border-teal-300 bg-teal-50 text-teal-950"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="block truncate text-sm font-semibold">{club.name}</span>
                  <span className="block truncate text-xs text-slate-500">{club.description || "No description"}</span>
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => submitLocalForm(event, createClub)}
              className="mt-4 space-y-3 border-t border-slate-200 pt-4"
            >
              <div className="space-y-2">
                <Label htmlFor="local-club-name">New club</Label>
                <Input id="local-club-name" name="name" placeholder="Music Club" required />
              </div>
              <Input name="description" placeholder="Short description" />
              <Button type="submit" size="sm" className="w-full">
                <Plus size={14} />
                Add club
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList size={16} />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Projects</h2>
            </div>
            <div className="space-y-2">
              {activeClub.projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() =>
                    setSelection((current) => ({
                      ...current,
                      activeProjectId: project.id
                    }))
                  }
                  className={`w-full rounded-md border px-3 py-2 text-left transition ${
                    project.id === activeProject.id
                      ? "border-teal-300 bg-teal-50 text-teal-950"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="block truncate text-sm font-semibold">{project.name}</span>
                  <span className="block truncate text-xs text-slate-500">{project.description || "No description"}</span>
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => submitLocalForm(event, createProject)}
              className="mt-4 space-y-3 border-t border-slate-200 pt-4"
            >
              <div className="space-y-2">
                <Label htmlFor="local-project-name">New project</Label>
                <Input id="local-project-name" name="name" placeholder="Orientation Week" required />
              </div>
              <Input name="description" placeholder="Short description" />
              <Button type="submit" size="sm" className="w-full">
                <Plus size={14} />
                Add project
              </Button>
            </form>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Members</h2>
            <div className="mt-3 space-y-3">
              {activeClub.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{member.fullName}</p>
                    <p className="truncate text-xs text-slate-500">{member.email}</p>
                  </div>
                  <Badge variant={member.role === "owner" ? "amber" : "neutral"}>{roleLabels[member.role]}</Badge>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{activeClub.name}</p>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">{activeProject.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{activeProject.description || "No description yet."}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ViewButton active={view === "tasks"} onClick={() => setView("tasks")} icon={<ClipboardList size={16} />}>
                Tasks
              </ViewButton>
              <ViewButton active={view === "board"} onClick={() => setView("board")} icon={<PenTool size={16} />}>
                Board
              </ViewButton>
              <ViewButton active={view === "notes"} onClick={() => setView("notes")} icon={<FileText size={16} />}>
                Notes
              </ViewButton>
            </div>
          </div>

          {view === "tasks" ? (
            <LocalTaskBoard
              project={activeProject}
              members={activeClub.members}
              editingTaskId={editingTaskId}
              onEditTask={setEditingTaskId}
              onCreateTask={createTask}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onMoveTask={updateTaskStatus}
            />
          ) : null}

          {view === "board" ? (
            <LocalExcalidrawBoard projectId={activeProject.id} scene={activeProject.boardScene} onSave={saveBoardScene} />
          ) : null}

          {view === "notes" ? <LocalNotes key={activeProject.id} notes={activeProject.notes} onSave={saveNotes} /> : null}
        </section>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
        active ? "border-teal-700 bg-teal-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function LocalTaskBoard({
  project,
  members,
  editingTaskId,
  onEditTask,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onMoveTask
}: {
  project: LocalProject;
  members: LocalMember[];
  editingTaskId: string | null;
  onEditTask: (taskId: string | null) => void;
  onCreateTask: (formData: FormData) => void;
  onUpdateTask: (taskId: string, formData: FormData) => void;
  onDeleteTask: (taskId: string) => void;
  onMoveTask: (taskId: string, status: TaskStatus) => void;
}) {
  const grouped = useMemo(
    () =>
      statuses.reduce<Record<TaskStatus, LocalTask[]>>(
        (acc, status) => {
          acc[status] = project.tasks.filter((task) => task.status === status);
          return acc;
        },
        { todo: [], in_progress: [], done: [] }
      ),
    [project.tasks]
  );

  return (
    <div className="space-y-5">
      <form
        onSubmit={(event) => submitLocalForm(event, onCreateTask)}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h3 className="text-lg font-semibold text-slate-950">Create task</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr_9rem_12rem_10rem_auto] lg:items-end">
          <div className="space-y-2">
            <Label htmlFor="local-task-title">Title</Label>
            <Input id="local-task-title" name="title" placeholder="Confirm speaker list" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="local-task-description">Description</Label>
            <Input id="local-task-description" name="description" placeholder="Optional details" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="local-task-priority">Priority</Label>
            <PrioritySelect id="local-task-priority" name="priority" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="local-task-assignee">Assignee</Label>
            <MemberSelect id="local-task-assignee" name="assignedTo" members={members} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="local-task-due">Due date</Label>
            <Input id="local-task-due" name="dueDate" type="date" />
          </div>
          <Button type="submit">
            <Plus size={16} />
            Add
          </Button>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-3">
        {statuses.map((status) => (
          <section key={status} className="min-h-96 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">{taskStatusLabels[status]}</h3>
              <Badge>{grouped[status].length}</Badge>
            </div>
            <div className="space-y-3">
              {grouped[status].map((task) =>
                editingTaskId === task.id ? (
                  <LocalTaskEditForm
                    key={task.id}
                    task={task}
                    members={members}
                    onCancel={() => onEditTask(null)}
                    onSubmit={(formData) => onUpdateTask(task.id, formData)}
                  />
                ) : (
                  <LocalTaskCard
                    key={task.id}
                    task={task}
                    members={members}
                    onEdit={() => onEditTask(task.id)}
                    onDelete={() => onDeleteTask(task.id)}
                    onMove={(nextStatus) => onMoveTask(task.id, nextStatus)}
                  />
                )
              )}
              {grouped[status].length === 0 ? (
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

function LocalTaskCard({
  task,
  members,
  onEdit,
  onDelete,
  onMove
}: {
  task: LocalTask;
  members: LocalMember[];
  onEdit: () => void;
  onDelete: () => void;
  onMove: (status: TaskStatus) => void;
}) {
  const assignee = members.find((member) => member.id === task.assignedTo);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-semibold text-slate-950">{task.title}</h4>
          {task.description ? <p className="mt-2 break-words text-sm text-slate-600">{task.description}</p> : null}
        </div>
        <Badge variant={task.priority === "high" ? "rose" : task.priority === "medium" ? "amber" : "neutral"}>
          {priorityLabels[task.priority]}
        </Badge>
      </div>

      <div className="mt-4 space-y-2 text-xs text-slate-500">
        <p>
          Assigned to <span className="font-semibold text-slate-700">{assignee?.fullName || "Unassigned"}</span>
        </p>
        {task.dueDate ? (
          <p className="flex items-center gap-1.5">
            <CalendarDays size={14} />
            {task.dueDate}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {statuses
          .filter((status) => status !== task.status)
          .map((status) => (
            <Button key={status} type="button" variant="ghost" size="sm" onClick={() => onMove(status)}>
              {taskStatusLabels[status]}
            </Button>
          ))}
        <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button type="button" variant="danger" size="sm" onClick={onDelete} aria-label="Delete task">
          <Trash2 size={14} />
        </Button>
      </div>
    </article>
  );
}

function LocalTaskEditForm({
  task,
  members,
  onCancel,
  onSubmit
}: {
  task: LocalTask;
  members: LocalMember[];
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  return (
    <form
      onSubmit={(event) => submitLocalForm(event, onSubmit, false)}
      className="rounded-lg border border-teal-200 bg-white p-4 shadow-sm"
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`local-title-${task.id}`}>Title</Label>
          <Input id={`local-title-${task.id}`} name="title" defaultValue={task.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`local-description-${task.id}`}>Description</Label>
          <Textarea id={`local-description-${task.id}`} name="description" defaultValue={task.description} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`local-status-${task.id}`}>Status</Label>
            <Select id={`local-status-${task.id}`} name="status" defaultValue={task.status}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {taskStatusLabels[status]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`local-priority-${task.id}`}>Priority</Label>
            <PrioritySelect id={`local-priority-${task.id}`} name="priority" defaultValue={task.priority} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`local-assignee-${task.id}`}>Assignee</Label>
            <MemberSelect id={`local-assignee-${task.id}`} name="assignedTo" members={members} defaultValue={task.assignedTo} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`local-due-${task.id}`}>Due date</Label>
            <Input id={`local-due-${task.id}`} name="dueDate" type="date" defaultValue={task.dueDate} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm">
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
  members: LocalMember[];
  id: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <Select defaultValue={defaultValue} {...props}>
      <option value="">Unassigned</option>
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          {member.fullName}
        </option>
      ))}
    </Select>
  );
}

function PrioritySelect({
  defaultValue = "medium",
  ...props
}: {
  id: string;
  name: string;
  defaultValue?: TaskPriority;
}) {
  return (
    <Select defaultValue={defaultValue} {...props}>
      {priorities.map((priority) => (
        <option key={priority} value={priority}>
          {priorityLabels[priority]}
        </option>
      ))}
    </Select>
  );
}

function LocalNotes({ notes, onSave }: { notes: string; onSave: (notes: string) => void }) {
  const [draft, setDraft] = useState(notes);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-950">Meeting notes</h3>
          <Button type="submit" size="sm">
            <Save size={14} />
            Save
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="local-notes">Markdown</Label>
          <Textarea
            id="local-notes"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[28rem] font-mono"
          />
        </div>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-950">Preview</h3>
        <div className="markdown-preview mt-4 min-h-[28rem] rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {draft ? <ReactMarkdown>{draft}</ReactMarkdown> : <p className="text-slate-500">No notes yet.</p>}
        </div>
      </section>
    </div>
  );
}

function LocalExcalidrawBoard({
  projectId,
  scene,
  onSave
}: {
  projectId: string;
  scene: BoardScene;
  onSave: (scene: BoardScene) => void;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSignature = useRef(sceneSignature(scene));
  const lastQueuedSignature = useRef<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const initialData = useMemo<ExcalidrawInitialDataState>(
    () => ({
      elements: (scene?.elements ?? []) as unknown as readonly OrderedExcalidrawElement[],
      appState: {
        viewBackgroundColor: "#ffffff",
        ...(scene?.appState ?? {})
      },
      files: (scene?.files ?? {}) as unknown as BinaryFiles
    }),
    [scene]
  );

  useEffect(() => {
    lastSavedSignature.current = sceneSignature(scene);
    lastQueuedSignature.current = null;

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [projectId, scene]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-12 items-center justify-between border-b border-slate-200 px-4 py-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">Visual board</h3>
          <p className="text-xs text-slate-500">Autosaves to shared LAN data</p>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Synced" : ""}
        </span>
      </div>
      <div className="h-[calc(100vh-15rem)] min-h-[34rem]">
        <Excalidraw
          key={projectId}
          initialData={initialData}
          onChange={(elements, appState, files) => {
            const nextScene: BoardScene = {
              elements: [...elements],
              appState: sanitizeAppState(appState),
              files: files as unknown as Record<string, unknown>
            };
            const nextSignature = sceneSignature(nextScene);

            if (nextSignature === lastSavedSignature.current || nextSignature === lastQueuedSignature.current) {
              return;
            }

            if (saveTimer.current) {
              clearTimeout(saveTimer.current);
            }

            lastQueuedSignature.current = nextSignature;
            setSaveState("saving");
            saveTimer.current = setTimeout(() => {
              onSave(nextScene);
              lastSavedSignature.current = nextSignature;
              lastQueuedSignature.current = null;
              setSaveState("saved");
            }, 700);
          }}
        />
      </div>
    </div>
  );
}

function sanitizeAppState(appState: AppState) {
  return {
    viewBackgroundColor: appState.viewBackgroundColor,
    gridSize: appState.gridSize,
    theme: appState.theme,
    name: appState.name
  };
}

function sceneSignature(scene: BoardScene) {
  return JSON.stringify({
    elements: scene.elements ?? [],
    appState: scene.appState ?? {},
    files: scene.files ?? {}
  });
}

function normalizeStatus(value: string): TaskStatus {
  return statuses.includes(value as TaskStatus) ? (value as TaskStatus) : "todo";
}

function normalizePriority(value: string): TaskPriority {
  return priorities.includes(value as TaskPriority) ? (value as TaskPriority) : "medium";
}
