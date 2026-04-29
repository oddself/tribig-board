"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { ensureProfile, readFormString } from "@/lib/actions/helpers";

function redirectWithMessage(path: string, type: "error" | "message", message: string) {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export async function signIn(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/login", "error", "Supabase environment variables are missing.");
  }

  const email = readFormString(formData, "email").toLowerCase();
  const password = readFormString(formData, "password");
  const next = readFormString(formData, "next") || "/clubs";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithMessage("/login", "error", error.message);
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    await ensureProfile(supabase, user);
  }

  redirect(next.startsWith("/") ? next : "/clubs");
}

export async function signUp(formData: FormData) {
  if (!hasSupabaseEnv()) {
    redirectWithMessage("/signup", "error", "Supabase environment variables are missing.");
  }

  const email = readFormString(formData, "email").toLowerCase();
  const password = readFormString(formData, "password");
  const fullName = readFormString(formData, "full_name");
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: `${origin}/auth/callback`
    }
  });

  if (error) {
    redirectWithMessage("/signup", "error", error.message);
  }

  redirectWithMessage("/login", "message", "Account created. Confirm your email if required, then sign in.");
}

export async function signOut() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
