import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { LocalDemoApp } from "@/components/local/local-demo-app";

export default async function HomePage() {
  if (!hasSupabaseEnv()) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <LocalDemoApp />
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  redirect(user ? "/clubs" : "/login");
}
