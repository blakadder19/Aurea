grant delete on public.planning_scenarios to authenticated;

create policy own_planning_scenarios_delete on public.planning_scenarios
  for delete to authenticated using (user_id = (select auth.uid()));
