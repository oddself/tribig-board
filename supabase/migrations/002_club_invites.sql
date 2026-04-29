create table if not exists public.club_invites (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'editor', 'member', 'guest')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.club_invites enable row level security;

create or replace function public.has_pending_club_invite(club uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.club_invites i
    where i.club_id = club
      and i.status = 'pending'
      and lower(i.email) = lower(coalesce(auth.email(), ''))
  );
$$;

create policy "club managers can create invites"
on public.club_invites for insert
to authenticated
with check (
  public.can_manage_members(club_id)
  and invited_by = auth.uid()
  and status = 'pending'
  and role in ('admin', 'editor', 'member', 'guest')
);

create policy "club managers can view invites"
on public.club_invites for select
to authenticated
using (public.can_manage_members(club_id));

create policy "invited users can view pending invites"
on public.club_invites for select
to authenticated
using (
  status = 'pending'
  and lower(email) = lower(coalesce(auth.email(), ''))
);

create policy "invited users can accept pending invites"
on public.club_invites for update
to authenticated
using (
  status = 'pending'
  and lower(email) = lower(coalesce(auth.email(), ''))
)
with check (
  status = 'accepted'
  and accepted_at is not null
  and lower(email) = lower(coalesce(auth.email(), ''))
);

create policy "invited users can view invited clubs"
on public.clubs for select
to authenticated
using (public.has_pending_club_invite(id));

create policy "invited users can join clubs"
on public.club_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and role in ('admin', 'editor', 'member', 'guest')
  and exists (
    select 1
    from public.club_invites i
    where i.club_id = club_members.club_id
      and i.status = 'pending'
      and i.role = club_members.role
      and lower(i.email) = lower(coalesce(auth.email(), ''))
  )
);

create index if not exists club_invites_club_id_idx on public.club_invites(club_id);
create index if not exists club_invites_email_status_idx on public.club_invites(lower(email), status);
