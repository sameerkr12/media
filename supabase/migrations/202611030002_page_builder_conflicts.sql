-- Return a deterministic HTTP conflict instead of a retryable serialization error.
begin;
do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.empirex_save_page(text,bigint,jsonb,jsonb)'::regprocedure) into definition;
 execute replace(definition,'errcode=''40001''','errcode=''PT409''');
end;
$migration$;
notify pgrst,'reload schema';
commit;
