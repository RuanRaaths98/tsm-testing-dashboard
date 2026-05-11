create table if not exists public.dashboard_clients (
  id uuid primary key,
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_clients enable row level security;

-- Fast internal-team setup:
-- Use this while the app is behind a private domain or Vercel password protection.
-- For a stricter setup, replace these with authenticated-user policies.
create policy "dashboard_clients_read_all"
on public.dashboard_clients
for select
using (true);

create policy "dashboard_clients_insert_all"
on public.dashboard_clients
for insert
with check (true);

create policy "dashboard_clients_update_all"
on public.dashboard_clients
for update
using (true)
with check (true);

create policy "dashboard_clients_delete_all"
on public.dashboard_clients
for delete
using (true);
