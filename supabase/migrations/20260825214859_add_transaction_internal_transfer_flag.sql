alter table public.transactions add column is_internal_transfer boolean not null default false;
