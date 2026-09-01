create table public.planning_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  params jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

revoke all on public.planning_scenarios from public, anon, authenticated;
grant select, insert on public.planning_scenarios to authenticated;

alter table public.planning_scenarios enable row level security;

create policy own_planning_scenarios_select on public.planning_scenarios
  for select to authenticated using (user_id = (select auth.uid()));
create policy own_planning_scenarios_insert on public.planning_scenarios
  for insert to authenticated with check (user_id = (select auth.uid()));

create index idx_planning_scenarios_user on public.planning_scenarios (user_id);
