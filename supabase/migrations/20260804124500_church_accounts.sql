create table if not exists public.churches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  password_hash text not null,
  system_prompt text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.churches (id, slug, name, password_hash)
values
  (
    'e274faaf-c34f-4234-a862-04153b45f901',
    'redeemer-christian-church',
    'Redeemer Christian Church',
    'scrypt$16384$8$1$ECbZS8f2RSFITgRzQmh-RQ$FryUQhf5LBJSQlqLBb0kQnYFM_ST3U-zmd2PlXHr6lWChMbs6egtai5IGGLsV8tXjszFCGk-wLddgu8cV0Fa7Q'
  ),
  (
    '41d3cc46-da22-4e4c-97ae-6b09cca3c7d5',
    'everyday-people-east-coast',
    'Everyday People East Coast',
    'scrypt$16384$8$1$xAPWdMohjiZ5WYcmqoEDbQ$SSTqLraOebpVhlZfv3bYk82juqjpTOl_UN_J2T-QRub20sbkk9aTamgVmbnzRjdhknW6_dSwXX3uuqOTo1CEEA'
  )
on conflict (slug) do update
set
  name = excluded.name,
  password_hash = excluded.password_hash,
  is_active = true,
  updated_at = now();

alter table public.sermon_toolkit_sessions
  add column if not exists church_id uuid;

update public.sermon_toolkit_sessions
set church_id = (
  select id
  from public.churches
  where slug = 'redeemer-christian-church'
)
where church_id is null;

alter table public.sermon_toolkit_sessions
  alter column church_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sermon_toolkit_sessions_church_id_fkey'
      and conrelid = 'public.sermon_toolkit_sessions'::regclass
  ) then
    alter table public.sermon_toolkit_sessions
      add constraint sermon_toolkit_sessions_church_id_fkey
      foreign key (church_id) references public.churches(id) on delete restrict;
  end if;
end
$$;

alter table public.sermon_toolkit_sessions
  drop constraint if exists sermon_toolkit_sessions_transcript_sha256_key;

create unique index if not exists sermon_toolkit_sessions_church_transcript_idx
  on public.sermon_toolkit_sessions (church_id, transcript_sha256);

create index if not exists sermon_toolkit_sessions_church_created_at_idx
  on public.sermon_toolkit_sessions (church_id, created_at desc);

alter table public.churches enable row level security;

revoke all on table public.churches from anon, authenticated;
grant select, insert, update, delete on table public.churches to service_role;

comment on table public.churches is
  'Manually provisioned church logins and church-specific toolkit instructions.';

comment on column public.churches.password_hash is
  'Scrypt password hash. Plaintext church passwords are never stored.';

comment on column public.sermon_toolkit_sessions.church_id is
  'Church owner used to isolate transcript and toolkit history.';

notify pgrst, 'reload schema';
