-- Durable password-attempt throttling. Run in Supabase SQL Editor.
begin;
create table if not exists public.admin_login_attempts (
 bucket text primary key, attempts integer not null default 0,
 window_start timestamptz not null default now()
);
alter table public.admin_login_attempts enable row level security;
revoke all on public.admin_login_attempts from anon,authenticated;
grant select,insert,update,delete on public.admin_login_attempts to service_role;
create or replace function public.empirex_admin_login_attempt(p_bucket text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare attempt_count integer;
begin
 insert into public.admin_login_attempts(bucket,attempts,window_start) values(p_bucket,1,now())
 on conflict(bucket) do update set
 attempts=case when admin_login_attempts.window_start <= now()-interval '15 minutes' then 1 else admin_login_attempts.attempts+1 end,
 window_start=case when admin_login_attempts.window_start <= now()-interval '15 minutes' then now() else admin_login_attempts.window_start end
 returning attempts into attempt_count;
 return attempt_count<=5;
end;
$$;
revoke all on function public.empirex_admin_login_attempt(text) from public,anon,authenticated;
grant execute on function public.empirex_admin_login_attempt(text) to service_role;
notify pgrst, 'reload schema';
commit;
