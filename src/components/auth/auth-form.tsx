import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { signIn, signUp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

type AuthMessage = {
  error?: string;
  message?: string;
  next?: string;
};

export function LoginForm({ searchParams }: { searchParams: AuthMessage }) {
  return (
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Tribig Board</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">Use your club workspace account to continue.</p>
      </div>

      <AuthNotice error={searchParams.error} message={searchParams.message} />

      <form action={signIn} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={searchParams.next ?? "/clubs"} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" className="w-full">
          <LogIn size={16} />
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New to Tribig?{" "}
        <Link href="/signup" className="font-semibold text-teal-700 hover:text-teal-800">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export function SignupForm({ searchParams }: { searchParams: AuthMessage }) {
  return (
    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Tribig Board</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Create account</h1>
        <p className="mt-2 text-sm text-slate-600">Start a workspace for your university club.</p>
      </div>

      <AuthNotice error={searchParams.error} message={searchParams.message} />

      <form action={signUp} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" type="text" autoComplete="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </div>
        <Button type="submit" className="w-full">
          <UserPlus size={16} />
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal-700 hover:text-teal-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function AuthNotice({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) {
    return null;
  }

  return (
    <div
      className={`mt-5 rounded-md border px-3 py-2 text-sm ${
        error ? "border-rose-200 bg-rose-50 text-rose-800" : "border-teal-200 bg-teal-50 text-teal-800"
      }`}
    >
      {error ?? message}
    </div>
  );
}
