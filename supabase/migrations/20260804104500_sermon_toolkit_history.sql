create extension if not exists pgcrypto;

create table if not exists public.sermon_toolkit_sessions (
  id uuid primary key default gen_random_uuid(),
  transcript text not null,
  transcript_sha256 text not null unique check (char_length(transcript_sha256) = 64),
  preacher_name text not null,
  generation_prompt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sermon_toolkit_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sermon_toolkit_sessions(id) on delete cascade,
  parent_version_id uuid references public.sermon_toolkit_versions(id) on delete set null,
  source text not null check (source in ('generated', 'regenerated', 'ai-edit', 'manual')),
  toolkit text not null,
  edit_instructions text,
  created_at timestamptz not null default now()
);

create index if not exists sermon_toolkit_sessions_created_at_idx
  on public.sermon_toolkit_sessions (created_at desc);

create index if not exists sermon_toolkit_versions_session_created_at_idx
  on public.sermon_toolkit_versions (session_id, created_at desc);

alter table public.sermon_toolkit_sessions enable row level security;
alter table public.sermon_toolkit_versions enable row level security;

revoke all on table public.sermon_toolkit_sessions from anon, authenticated;
revoke all on table public.sermon_toolkit_versions from anon, authenticated;

grant select, insert, update, delete on table public.sermon_toolkit_sessions to service_role;
grant select, insert, update, delete on table public.sermon_toolkit_versions to service_role;

comment on table public.sermon_toolkit_sessions is
  'Full sermon transcripts and generation instructions used by the Redeemer toolkit app.';

comment on table public.sermon_toolkit_versions is
  'Generated, regenerated, AI-edited, and manually saved toolkit versions.';

notify pgrst, 'reload schema';
