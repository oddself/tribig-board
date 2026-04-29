"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  assertMemberBelongsToClub,
  emptyToNull,
  readFormString,
  requireProjectEditor,
  requireUser
} from "@/lib/actions/helpers";
import type { TaskPriority, TaskStatus } from "@/lib/types/domain";

const statuses: TaskStatus[] = ["todo", "in_progress", "done"];
const priorities: TaskPriority[] = ["low", "medium", "high"];

function normalizeStatus(value: string): TaskStatus {
  return statuses.includes(value as TaskStatus) ? (value as TaskStatus) : "todo";
}

function normalizePriority(value: string): TaskPriority {
  return priorities.includes(value as TaskPriority) ? (value as TaskPriority) : "medium";
}

export async function createTask(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const project = await requireProjectEditor(supabase, projectId, user.id);

  const title = readFormString(formData, "title");
  const assignedTo = emptyToNull(readFormString(formData, "assigned_to"));

  if (!title) {
    throw new Error("Task title is required.");
  }

  await assertMemberBelongsToClub(supabase, project.club_id, assignedTo);

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title,
    description: emptyToNull(readFormString(formData, "description")),
    status: normalizeStatus(readFormString(formData, "status")),
    priority: normalizePriority(readFormString(formData, "priority")),
    due_date: emptyToNull(readFormString(formData, "due_date")),
    assigned_to: assignedTo,
    created_by: user.id
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/clubs/${project.club_id}/projects/${projectId}`);
}

export async function updateTask(taskId: string, formData: FormData) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: task, error: taskError } = await supabase.from("tasks").select("project_id").eq("id", taskId).single();
  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Task not found.");
  }

  const project = await requireProjectEditor(supabase, task.project_id, user.id);
  const title = readFormString(formData, "title");
  const assignedTo = emptyToNull(readFormString(formData, "assigned_to"));

  if (!title) {
    throw new Error("Task title is required.");
  }

  await assertMemberBelongsToClub(supabase, project.club_id, assignedTo);

  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: emptyToNull(readFormString(formData, "description")),
      status: normalizeStatus(readFormString(formData, "status")),
      priority: normalizePriority(readFormString(formData, "priority")),
      due_date: emptyToNull(readFormString(formData, "due_date")),
      assigned_to: assignedTo
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/clubs/${project.club_id}/projects/${task.project_id}`);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: task, error: taskError } = await supabase.from("tasks").select("project_id").eq("id", taskId).single();
  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Task not found.");
  }

  const project = await requireProjectEditor(supabase, task.project_id, user.id);

  const { error } = await supabase.from("tasks").update({ status: normalizeStatus(status) }).eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/clubs/${project.club_id}/projects/${task.project_id}`);
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: task, error: taskError } = await supabase.from("tasks").select("project_id").eq("id", taskId).single();
  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Task not found.");
  }

  const project = await requireProjectEditor(supabase, task.project_id, user.id);
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/clubs/${project.club_id}/projects/${task.project_id}`);
}
