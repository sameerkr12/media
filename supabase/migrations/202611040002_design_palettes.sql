-- Allow the expanded design palette and button styles.
begin;
alter table public.creators drop constraint if exists creators_theme_check;
alter table public.creators add constraint creators_theme_check check(theme in ('empire','midnight','pearl','sunset','mint','mono','ocean','rose','violet','coffee'));
alter table public.creators drop constraint if exists creators_layout_check;
alter table public.creators add constraint creators_layout_check check(layout in ('rounded','pill','outline','glass','sharp','shadow'));
notify pgrst,'reload schema';
commit;
