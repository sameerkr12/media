-- Allow atomic page saves to delete removed links and their click history.
begin;
create or replace function public.empirex_save_page(
 p_creator_id text,p_expected_version bigint,p_profile jsonb,p_links jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare current_version bigint; item jsonb; position integer=0;
begin
 select edit_version into current_version from public.creators where id=p_creator_id for update;
 if not found then raise exception 'Creator not found' using errcode='P0002'; end if;
 if current_version<>p_expected_version then raise exception 'Page changed elsewhere; reload before saving' using errcode='PT409'; end if;
 if jsonb_typeof(p_links)<>'array' or jsonb_array_length(p_links)>200 then
  raise exception 'Invalid link list' using errcode='22023';
 end if;
 if (select count(*) from jsonb_array_elements(p_links))<>(select count(distinct value->>'id') from jsonb_array_elements(p_links)) then
  raise exception 'Duplicate link IDs' using errcode='22023';
 end if;
 if exists(select 1 from public.links l join jsonb_array_elements(p_links) j on l.id=j->>'id' where l.creator_id<>p_creator_id) then
  raise exception 'Link belongs to another creator' using errcode='42501';
 end if;
 delete from public.clicks where link_id in (select id from public.links l where l.creator_id=p_creator_id and not exists(select 1 from jsonb_array_elements(p_links) j where j->>'id'=l.id));
 delete from public.links l where l.creator_id=p_creator_id and not exists(select 1 from jsonb_array_elements(p_links) j where j->>'id'=l.id);
 update public.creators set name=p_profile->>'name',bio=p_profile->>'bio',
  theme=p_profile->>'theme',layout=p_profile->>'layout',font=p_profile->>'font',background=coalesce(p_profile->>'background','classic')
 where id=p_creator_id;
 for item in select value from jsonb_array_elements(p_links) loop
  insert into public.links(id,slug,title,brand,creator_id,destination,active,expires_at,tags,sort_order,icon)
  values(item->>'id',item->>'slug',item->>'title',item->>'brand',p_creator_id,item->>'destination',
   (item->>'active')::smallint,nullif(item->>'expires_at','')::timestamptz,
   array(select jsonb_array_elements_text(item->'tags')),position,coalesce(item->>'icon','auto'))
  on conflict(id) do update set title=excluded.title,brand=excluded.brand,destination=excluded.destination,
   active=excluded.active,expires_at=excluded.expires_at,tags=excluded.tags,sort_order=excluded.sort_order,icon=excluded.icon
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
