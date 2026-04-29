export function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <div className="rounded-lg border border-amber-200 bg-white p-8 shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-700">Setup required</p>
        <h1 className="text-3xl font-bold text-slate-950">Connect Supabase to run Tribig Board.</h1>
        <p className="mt-4 text-slate-600">
          Add your Supabase project URL and anon key to a local environment file, then run the SQL migration in
          <span className="font-mono text-slate-900"> supabase/migrations/001_initial_schema.sql</span>.
        </p>
        <pre className="mt-6 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm text-slate-100">
          NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co{"\n"}
          NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
        </pre>
      </div>
    </main>
  );
}
