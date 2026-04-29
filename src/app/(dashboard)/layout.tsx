import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { PoweredFooter } from "@/components/layout/powered-footer";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!hasSupabaseEnv()) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader userEmail="local.demo@tribig.app" showAuthActions={false} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        <PoweredFooter />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <PoweredFooter />
    </div>
  );
}
