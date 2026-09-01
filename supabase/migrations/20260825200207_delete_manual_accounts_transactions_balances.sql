-- Permite borrar SOLO datos manuales (accounts.connection_id apuntando a un
-- bank_connections con provider='manual'). Los datos sincronizados de un
-- banco real nunca se pueden borrar desde la app: se sustituye la policy
-- "own_*" (FOR ALL) por policies explícitas por comando, añadiendo una
-- policy de DELETE con la condición extra de que la fila cuelgue de una
-- conexión manual.

-- accounts
drop policy if exists own_accounts on public.accounts;
create policy own_accounts_select on public.accounts for select to authenticated using (user_id = (select auth.uid()));
create policy own_accounts_insert on public.accounts for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_accounts_update on public.accounts for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_accounts_delete_manual on public.accounts for delete to authenticated using (
  user_id = (select auth.uid())
  and connection_id in (select id from public.bank_connections where provider = 'manual' and user_id = (select auth.uid()))
);
grant delete on public.accounts to authenticated;

-- transactions
drop policy if exists own_transactions on public.transactions;
create policy own_transactions_select on public.transactions for select to authenticated using (user_id = (select auth.uid()));
create policy own_transactions_insert on public.transactions for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_transactions_update on public.transactions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_transactions_delete_manual on public.transactions for delete to authenticated using (
  user_id = (select auth.uid())
  and account_id in (
    select a.id from public.accounts a
    join public.bank_connections bc on bc.id = a.connection_id
    where bc.provider = 'manual' and a.user_id = (select auth.uid())
  )
);
grant delete on public.transactions to authenticated;

-- balances
drop policy if exists own_balances on public.balances;
create policy own_balances_select on public.balances for select to authenticated using (user_id = (select auth.uid()));
create policy own_balances_insert on public.balances for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_balances_update on public.balances for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_balances_delete_manual on public.balances for delete to authenticated using (
  user_id = (select auth.uid())
  and account_id in (
    select a.id from public.accounts a
    join public.bank_connections bc on bc.id = a.connection_id
    where bc.provider = 'manual' and a.user_id = (select auth.uid())
  )
);
grant delete on public.balances to authenticated;
