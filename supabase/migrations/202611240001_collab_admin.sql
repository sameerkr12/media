-- Collab Admin: creators managed for brand deals, and the deals themselves.
-- Run once in the Supabase SQL Editor. Access is authorized by the application
-- server (main admin only); anonymous clients get nothing.
begin;
create table if not exists public.collab_creators (
 id text primary key,
 name text not null,
 handle text not null default '',
 platform text not null default 'Instagram',
 followers bigint check(followers is null or followers>=0),
 niche text not null default '',
 email text not null default '',
 phone text not null default '',
 notes text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.collab_deals (
 id text primary key,
 brand text not null,
 creator_id text not null references public.collab_creators(id) on delete restrict,
 deliverables text not null default '',
 amount bigint not null default 0 check(amount>=0),
 status text not null default 'upcoming' check(status in ('upcoming','active','pending','completed')),
 paid smallint not null default 0 check(paid in (0,1)),
 start_date date,
 due_date date,
 contact text not null default '',
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists collab_deal_creator on public.collab_deals(creator_id);
create index if not exists collab_deal_status on public.collab_deals(status);
alter table public.collab_creators enable row level security;
alter table public.collab_deals enable row level security;
revoke all on public.collab_creators,public.collab_deals from anon,authenticated;
grant select,insert,update,delete on public.collab_creators,public.collab_deals to service_role;
notify pgrst,'reload schema';
commit;
