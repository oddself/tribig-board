import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/auth-form";
import { LocalDemoApp } from "@/components/local/local-demo-app";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sign in"
};

type PageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  if (!hasSupabaseEnv()) {
    return <LocalDemoApp />;
  }

  return <LoginForm searchParams={await searchParams} />;
}
