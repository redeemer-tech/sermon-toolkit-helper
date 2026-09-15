create table if not exists public.project_keepalive (
  id text primary key check (id = 'daily'),
  last_ping_at timestamptz not null default now()
);

insert into public.project_keepalive (id)
values ('daily')
on conflict (id) do nothing;

alter table public.project_keepalive enable row level security;

revoke all on table public.project_keepalive from anon, authenticated;
grant select, insert, update on table public.project_keepalive to service_role;

comment on table public.project_keepalive is
  'Single-row heartbeat updated by the secured daily Vercel cron job.';

notify pgrst, 'reload schema';
