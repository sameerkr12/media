-- Page builder: tags, persistent ordering, atomic saves and stale-edit protection.
begin;
alter table public.links add column if not exists tags text[] not null default '{}';
alter table public.creators add column if not exists edit_version bigint not null default 0;
do $migration$
begin
 if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='links' and column_name='sort_order') then
  alter table public.links add column sort_order integer not null default 0;
  with ranked as (
   select id,(row_number() over(partition by creator_id order by created_at desc,id)-1)::integer as position
   from public.links
  ) update public.links l set sort_order=r.position from ranked r where r.id=l.id;
 end if;
end;
$migration$;
create index if not exists link_creator_order on public.links(creator_id,sort_order,created_at desc,id);

create or replace function public.empirex_bump_creator_version()
returns trigger language plpgsql set search_path=public as $$
begin new.edit_version=old.edit_version+1; return new; end;
$$;
drop trigger if exists empirex_creator_version on public.creators;
create trigger empirex_creator_version before update on public.creators
for each row execute function public.empirex_bump_creator_version();

create or replace function public.empirex_link_version()
returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='DELETE' then
  update public.creators set edit_version=edit_version+1 where id=old.creator_id;
  return old;
 end if;
 update public.creators set edit_version=edit_version+1 where id=new.creator_id;
 if tg_op='UPDATE' and old.creator_id is distinct from new.creator_id then
  update public.creators set edit_version=edit_version+1 where id=old.creator_id;
 end if;
 return new;
end;
$$;
drop trigger if exists empirex_link_version on public.links;
create trigger empirex_link_version after insert or update or delete on public.links
for each row execute function public.empirex_link_version();

create or replace function public.empirex_page_builder(p_creator_id text)
returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object(
  'creator',jsonb_build_object('id',c.id,'name',c.name,'handle',c.handle,'bio',c.bio,
   'theme',c.theme,'layout',c.layout,'font',c.font,'edit_version',c.edit_version),
  'links',coalesce((select jsonb_agg(to_jsonb(l) order by l.sort_order,l.created_at desc,l.id)
   from public.links l where l.creator_id=c.id),'[]'::jsonb)
 ) from public.creators c where c.id=p_creator_id;
$$;

create or replace function public.empirex_save_page(
 p_creator_id text,p_expected_version bigint,p_profile jsonb,p_links jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare current_version bigint; item jsonb; position integer=0;
begin
 select edit_version into current_version from public.creators where id=p_creator_id for update;
 if not found then raise exception 'Creator not found' using errcode='P0002'; end if;
 if current_version<>p_expected_version then raise exception 'Page changed elsewhere; reload before saving' using errcode='40001'; end if;
 if jsonb_typeof(p_links)<>'array' or jsonb_array_length(p_links)>200 then
  raise exception 'Invalid link list' using errcode='22023';
 end if;
 if (select count(*) from jsonb_array_elements(p_links))<>(select count(distinct value->>'id') from jsonb_array_elements(p_links)) then
  raise exception 'Duplicate link IDs' using errcode='22023';
 end if;
 if exists(select 1 from public.links l where l.creator_id=p_creator_id
  and not exists(select 1 from jsonb_array_elements(p_links) j where j->>'id'=l.id)) then
  raise exception 'Existing links cannot be omitted; hide them instead' using errcode='22023';
 end if;
 if exists(select 1 from public.links l join jsonb_array_elements(p_links) j on l.id=j->>'id' where l.creator_id<>p_creator_id) then
  raise exception 'Link belongs to another creator' using errcode='42501';
 end if;
 update public.creators set name=p_profile->>'name',bio=p_profile->>'bio',
  theme=p_profile->>'theme',layout=p_profile->>'layout',font=p_profile->>'font'
 where id=p_creator_id;
 for item in select value from jsonb_array_elements(p_links) loop
  insert into public.links(id,slug,title,brand,creator_id,destination,active,expires_at,tags,sort_order)
  values(item->>'id',item->>'slug',item->>'title',item->>'brand',p_creator_id,item->>'destination',
   (item->>'active')::smallint,nullif(item->>'expires_at','')::timestamptz,
   array(select jsonb_array_elements_text(item->'tags')),position)
  on conflict(id) do update set title=excluded.title,brand=excluded.brand,destination=excluded.destination,
   active=excluded.active,expires_at=excluded.expires_at,tags=excluded.tags,sort_order=excluded.sort_order
  where links.creator_id=p_creator_id;
  position=position+1;
 end loop;
 return public.empirex_page_builder(p_creator_id);
end;
$$;
revoke all on function public.empirex_page_builder(text) from public,anon,authenticated;
revoke all on function public.empirex_save_page(text,bigint,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.empirex_bump_creator_version() from public,anon,authenticated;
revoke all on function public.empirex_link_version() from public,anon,authenticated;
grant execute on function public.empirex_page_builder(text) to service_role;
grant execute on function public.empirex_save_page(text,bigint,jsonb,jsonb) to service_role;
grant execute on function public.empirex_bump_creator_version() to service_role;
grant execute on function public.empirex_link_version() to service_role;
notify pgrst,'reload schema';
commit;
