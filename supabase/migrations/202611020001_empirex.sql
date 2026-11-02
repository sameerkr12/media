-- Run once in the Supabase SQL Editor. No API keys belong in this file.
begin;
create table if not exists public.admins (
 user_id text primary key, created_at timestamptz not null default now()
);
create table if not exists public.creators (
 id text primary key, name text not null, handle text not null,
 email text, user_id text, bio text not null default '',
 theme text not null default 'empire' check(theme in ('empire','midnight','pearl','sunset','mint','mono')),
 layout text not null default 'rounded' check(layout in ('rounded','pill','outline')),
 font text not null default 'modern' check(font in ('modern','editorial','mono')),
 created_at timestamptz not null default now()
);
create unique index if not exists creator_handle on public.creators(lower(handle));
create unique index if not exists creator_email on public.creators(lower(email));
create unique index if not exists creator_user on public.creators(user_id);
create table if not exists public.links (
 id text primary key, slug text not null unique, title text not null, brand text not null default 'Website',
 creator_id text not null references public.creators(id), destination text not null,
 active smallint not null default 1 check(active in (0,1)), expires_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists link_creator on public.links(creator_id);
create table if not exists public.clicks (
 id text primary key, link_id text not null references public.links(id), visitor text not null,
 country text not null, device text not null, referrer text not null,
 created_at timestamptz not null default now()
);
create index if not exists click_link_date on public.clicks(link_id,created_at);
create index if not exists click_visitor on public.clicks(link_id,visitor);
-- Existing ChatGPT identity is authorized by the application server.
-- Never grant anonymous clients access to private tables or these functions.
alter table public.admins enable row level security;
alter table public.creators enable row level security;
alter table public.links enable row level security;
alter table public.clicks enable row level security;
revoke all on public.admins,public.creators,public.links,public.clicks from anon,authenticated;
grant select,insert,update,delete on public.admins,public.creators,public.links,public.clicks to service_role;

create or replace function public.empirex_dashboard(p_scope text default null, p_admin boolean default false)
returns jsonb language sql stable security invoker set search_path = public as $$
 with scoped_links as (
  select l.*, c.name as creator_name, c.handle as creator_handle
  from public.links l join public.creators c on c.id=l.creator_id
  where p_scope is null or l.creator_id=p_scope
 ), scoped_clicks as (
  select k.* from public.clicks k join scoped_links l on l.id=k.link_id
 ), metrics as (
  select link_id,count(*) as clicks,count(distinct visitor) as visitors,max(created_at) as last_click
  from scoped_clicks group by link_id
 ), daily as (
  select to_char(created_at at time zone 'UTC','YYYY-MM-DD') as day,count(*) as clicks
  from scoped_clicks where created_at >= (current_date - 29)::timestamp at time zone 'UTC'
  group by 1 order by 1
 ), breakdown as (
  select device,country,referrer,count(*) as clicks from scoped_clicks
  group by device,country,referrer order by clicks desc
 ), link_rows as (
  select l.*,coalesce(m.clicks,0) as clicks,coalesce(m.visitors,0) as visitors,m.last_click
  from scoped_links l left join metrics m on m.link_id=l.id order by l.created_at desc,l.id
 ), creator_rows as (
  select c.*,(select count(*) from public.links l where l.creator_id=c.id) as link_count,
  (select count(*) from public.clicks k join public.links l on l.id=k.link_id where l.creator_id=c.id) as click_count
  from public.creators c where p_admin or c.id=p_scope order by c.created_at,c.id
 )
 select jsonb_build_object(
  'creators',coalesce((select jsonb_agg(to_jsonb(c)) from creator_rows c),'[]'::jsonb),
  'links',coalesce((select jsonb_agg(to_jsonb(l)) from link_rows l),'[]'::jsonb),
  'daily',coalesce((select jsonb_agg(to_jsonb(d)) from daily d),'[]'::jsonb),
  'breakdown',coalesce((select jsonb_agg(to_jsonb(b)) from breakdown b),'[]'::jsonb)
 );
$$;
revoke all on function public.empirex_dashboard(text,boolean) from public,anon,authenticated;
grant execute on function public.empirex_dashboard(text,boolean) to service_role;
notify pgrst, 'reload schema';
commit;
