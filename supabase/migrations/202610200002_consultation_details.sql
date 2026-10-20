-- Add consultation fields without changing existing requests or participant permissions.
begin;
alter table public.coaching_requests add column if not exists preferred_area text not null default '';
alter table public.coaching_requests add column if not exists equipment_status text not null default '';
do $constraints$
begin
 if not exists(select 1 from pg_constraint where conrelid='public.coaching_requests'::regclass and conname='requests_preferred_area_check') then
  alter table public.coaching_requests add constraint requests_preferred_area_check check(preferred_area in ('','北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県','茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県','新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県','静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県','奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県','徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県','熊本県','大分県','宮崎県','鹿児島県','沖縄県'));
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.coaching_requests'::regclass and conname='requests_equipment_status_check') then
  alter table public.coaching_requests add constraint requests_equipment_status_check check(equipment_status in ('','owned','partial','none'));
 end if;
end;
$constraints$;
-- Grant only insertion. Submitted details remain immutable, as with the existing message.
grant insert(preferred_area,equipment_status) on public.coaching_requests to authenticated;
notify pgrst,'reload schema';
commit;
