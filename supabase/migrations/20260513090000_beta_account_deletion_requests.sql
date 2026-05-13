create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  operator_note text
);

create unique index if not exists account_deletion_requests_open_once_idx
  on public.account_deletion_requests (user_id)
  where status = 'pending';

create index if not exists account_deletion_requests_status_requested_at_idx
  on public.account_deletion_requests (status, requested_at desc);

alter table public.account_deletion_requests enable row level security;

drop policy if exists "users can read own account deletion requests" on public.account_deletion_requests;
create policy "users can read own account deletion requests"
  on public.account_deletion_requests for select
  using (auth.uid() = user_id);

-- Inserts are performed through the server API with the service role after auth.uid() verification.
-- Clients do not receive a direct insert/update/delete policy.
