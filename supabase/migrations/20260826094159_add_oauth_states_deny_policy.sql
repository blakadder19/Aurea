create policy deny_client_access on public.oauth_states
  for all to authenticated, anon
  using (false)
  with check (false);
