-- Chạy file này trong Supabase → SQL Editor nếu bạn đã chạy schema.sql bản cũ.
-- Thêm vị trí nhà cho hộ dân (chỉ huy xem toàn cảnh). Chạy lại nhiều lần được.

alter table profiles add column if not exists home_lat double precision check (home_lat between -90 and 90);
alter table profiles add column if not exists home_lng double precision check (home_lng between -180 and 180);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := new.raw_user_meta_data;
begin
  insert into profiles (id, full_name, phone, province, ward, hamlet, address_detail,
                        household_size, vulnerable, relative_phone, note, home_lat, home_lng)
  values (
    new.id,
    coalesce(m->>'full_name', ''),
    coalesce(m->>'phone', ''),
    m->>'province', m->>'ward', m->>'hamlet', m->>'address_detail',
    coalesce((m->>'household_size')::int, 1),
    coalesce(array(select jsonb_array_elements_text(m->'vulnerable')), '{}'),
    m->>'relative_phone', m->>'note',
    nullif(m->>'home_lat', '')::double precision, nullif(m->>'home_lng', '')::double precision
  );
  return new;
end $$;
