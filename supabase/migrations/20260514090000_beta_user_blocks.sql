create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self_block check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocked_id_idx
  on public.user_blocks (blocked_id, created_at desc);

alter table public.user_blocks enable row level security;

drop policy if exists "users can read own blocks" on public.user_blocks;
create policy "users can read own blocks"
  on public.user_blocks for select
  using (blocker_id = auth.uid());

drop policy if exists "users can create own blocks" on public.user_blocks;
create policy "users can create own blocks"
  on public.user_blocks for insert
  with check (blocker_id = auth.uid());

drop policy if exists "users can delete own blocks" on public.user_blocks;
create policy "users can delete own blocks"
  on public.user_blocks for delete
  using (blocker_id = auth.uid());

comment on table public.user_blocks is
  'Per-user UGC block list. Public feed APIs hide reports and questions written by blocked users.';
