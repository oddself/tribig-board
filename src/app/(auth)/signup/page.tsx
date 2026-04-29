import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/auth-form";
import { LocalDemoApp } from "@/components/local/local-demo-app";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Create account"
};

type PageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignupPage({ searchParams }: PageProps) {
  if (!hasSupabaseEnv()) {
    return <LocalDemoApp />;
  }

  return <SignupForm searchParams={await searchParams} />;
}
