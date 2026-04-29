import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button, LinkButton } from "@/components/ui/button";

export function AppHeader({ userEmail, showAuthActions = true }: { userEmail?: string | null; showAuthActions?: boolean }) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/clubs" className="flex items-center gap-3 text-slate-950">
          <span className="flex size-9 items-center justify-center rounded-md bg-teal-700 text-sm font-black text-white">
            TB
          </span>
          <span className="font-bold">Tribig Board</span>
        </Link>

        <div className="flex items-center gap-3">
          {userEmail ? <span className="hidden text-sm text-slate-600 sm:inline">{userEmail}</span> : null}
          <LinkButton href="/clubs" variant="ghost" size="sm" aria-label="Dashboard">
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">Clubs</span>
          </LinkButton>
          {showAuthActions ? (
            <form action={signOut}>
              <Button type="submit" variant="secondary" size="sm" aria-label="Sign out">
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}
