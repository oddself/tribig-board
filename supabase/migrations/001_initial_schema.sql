create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'member', 'guest')),
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date date,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_boards (
  project_id uuid primary key references public.projects(id) on delete cascade,
  scene_json jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.project_notes (
  project_id uuid primary key references public.projects(id) on delete cascade,
  body text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger clubs_touch_updated_at
before update on public.clubs
for each row execute function public.touch_updated_at();

create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.club_role(club uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role
  from public.club_members
  where club_id = club
    and user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_view_club(club uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.club_members
    where club_id = club
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_manage_members(club uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.club_role(club), '') in ('owner', 'admin');
$$;

create or replace function public.can_edit_club(club uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.club_role(club), '') in ('owner', 'admin', 'editor');
$$;

create or replace function public.can_view_project(project uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = project
      and public.can_view_club(p.club_id)
  );
$$;

create or replace function public.can_edit_project(project uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = project
      and public.can_edit_club(p.club_id)
  );
$$;

alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.project_boards enable row level security;
alter table public.project_notes enable row level security;

create policy "profiles are visible to signed in users"
on public.profiles for select
to authenticated
using (true);

create policy "users can insert their own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "users can update their own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "members can view clubs"
on public.clubs for select
to authenticated
using (public.can_view_club(id));

create policy "authenticated users can create clubs"
on public.clubs for insert
to authenticated
with check (created_by = auth.uid());

create policy "club editors can update clubs"
on public.clubs for update
to authenticated
using (public.can_edit_club(id))
with check (public.can_edit_club(id));

create policy "club owners can delete clubs"
on public.clubs for delete
to authenticated
using (public.club_role(id) = 'owner');

create policy "members can view club membership"
on public.club_members for select
to authenticated
using (public.can_view_club(club_id));

create policy "club creators and managers can add members"
on public.club_members for insert
to authenticated
with check (
  exists (
    select 1
    from public.clubs c
    where c.id = club_id
      and c.created_by = auth.uid()
  )
  or public.can_manage_members(club_id)
);

create policy "club managers can update members"
on public.club_members for update
to authenticated
using (public.can_manage_members(club_id))
with check (public.can_manage_members(club_id));

create policy "club managers can remove members"
on public.club_members for delete
to authenticated
using (public.can_manage_members(club_id));

create policy "members can view projects"
on public.projects for select
to authenticated
using (public.can_view_club(club_id));

create policy "club editors can create projects"
on public.projects for insert
to authenticated
with check (created_by = auth.uid() and public.can_edit_club(club_id));

create policy "club editors can update projects"
on public.projects for update
to authenticated
using (public.can_edit_club(club_id))
with check (public.can_edit_club(club_id));

create policy "club editors can delete projects"
on public.projects for delete
to authenticated
using (public.can_edit_club(club_id));

create policy "project members can view tasks"
on public.tasks for select
to authenticated
using (public.can_view_project(project_id));

create policy "project editors can create tasks"
on public.tasks for insert
to authenticated
with check (created_by = auth.uid() and public.can_edit_project(project_id));

create policy "project editors can update tasks"
on public.tasks for update
to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

create policy "project editors can delete tasks"
on public.tasks for delete
to authenticated
using (public.can_edit_project(project_id));

create policy "project members can view boards"
on public.project_boards for select
to authenticated
using (public.can_view_project(project_id));

create policy "project editors can create boards"
on public.project_boards for insert
to authenticated
with check (public.can_edit_project(project_id));

create policy "project editors can update boards"
on public.project_boards for update
to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

create policy "project members can view notes"
on public.project_notes for select
to authenticated
using (public.can_view_project(project_id));

create policy "project editors can create notes"
on public.project_notes for insert
to authenticated
with check (public.can_edit_project(project_id));

create policy "project editors can update notes"
on public.project_notes for update
to authenticated
using (public.can_edit_project(project_id))
with check (public.can_edit_project(project_id));

create index club_members_user_id_idx on public.club_members(user_id);
create index club_members_club_id_idx on public.club_members(club_id);
create index projects_club_id_idx on public.projects(club_id);
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
