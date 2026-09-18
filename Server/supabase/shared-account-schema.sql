-- 菜猪猪共享账号云备份（在 Supabase Dashboard > SQL Editor 运行一次）
-- 每个登录用户只可读取、创建、更新自己的整份应用状态。

create table if not exists public.app_states (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_states enable row level security;

drop policy if exists "Users can read their own app state" on public.app_states;
create policy "Users can read their own app state"
  on public.app_states for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own app state" on public.app_states;
create policy "Users can create their own app state"
  on public.app_states for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own app state" on public.app_states;
create policy "Users can update their own app state"
  on public.app_states for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.set_app_state_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_states_updated_at on public.app_states;
create trigger app_states_updated_at
before update on public.app_states
for each row execute function public.set_app_state_updated_at();
