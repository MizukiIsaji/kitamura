-- 釣果記録に重さ（g・自己申告）を追加する。サイズ（cm）と同じ扱いで、必須ではない。
begin;
alter table public.posts add column if not exists weight_g integer check (weight_g>0 and weight_g<=100000);
grant insert(weight_g) on public.posts to authenticated;
grant update(weight_g) on public.posts to authenticated;
notify pgrst,'reload schema';
commit;
