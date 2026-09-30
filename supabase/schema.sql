-- ============================================================
-- SOS vùng lũ — schema Supabase (GĐ1)
-- Chạy toàn bộ file này trong Supabase → SQL Editor → New query → Run.
-- Chạy lại nhiều lần được (idempotent ở mức cơ bản).
-- ============================================================

-- ---------- Kiểu dữ liệu ----------
do $$ begin
  create type user_role as enum ('citizen', 'rescuer', 'commander');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sos_status as enum ('waiting', 'assigned', 'on_way', 'arrived', 'rescued', 'cannot_reach', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type team_status as enum ('ready', 'busy', 'resting', 'out_of_fuel');
exception when duplicate_object then null; end $$;

-- ---------- Bảng ----------
create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vehicle text not null default 'xuồng',
  capacity int not null default 6,
  status team_status not null default 'ready',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text not null unique,
  role user_role not null default 'citizen',
  team_id uuid references teams on delete set null,
  province text,
  ward text,
  hamlet text,
  address_detail text,
  household_size int not null default 1 check (household_size between 1 and 100),
  vulnerable text[] not null default '{}',
  relative_phone text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists sos_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete set null,
  guest_name text,
  guest_phone text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accuracy double precision,
  battery int check (battery between 0 and 100),
  people_count int not null default 1 check (people_count between 1 and 200),
  water_level text check (water_level in ('ankle', 'knee', 'chest', 'roof')),
  injured boolean not null default false,
  note text,
  status sos_status not null default 'waiting',
  assigned_team_id uuid references teams on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sos_requests_status_idx on sos_requests (status);

-- Vị trí mới nhất của mỗi người cứu hộ (1 dòng / người)
create table if not exists rescuer_locations (
  user_id uuid primary key references profiles on delete cascade,
  team_id uuid references teams on delete set null,
  lat double precision not null,
  lng double precision not null,
  on_duty boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Nhật ký thao tác trên SOS (ai làm gì, lúc nào)
create table if not exists sos_events (
  id bigserial primary key,
  sos_id uuid not null references sos_requests on delete cascade,
  actor_id uuid references profiles on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------- Hàm tiện ích ----------
create or replace function my_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function my_team() returns uuid
language sql stable security definer set search_path = public as $$
  select team_id from profiles where id = auth.uid()
$$;

-- Tạo hồ sơ tự động khi đăng ký (lấy từ metadata lúc signUp)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := new.raw_user_meta_data;
begin
  insert into profiles (id, full_name, phone, province, ward, hamlet, address_detail,
                        household_size, vulnerable, relative_phone, note)
  values (
    new.id,
    coalesce(m->>'full_name', ''),
    coalesce(m->>'phone', ''),
    m->>'province', m->>'ward', m->>'hamlet', m->>'address_detail',
    coalesce((m->>'household_size')::int, 1),
    coalesce(array(select jsonb_array_elements_text(m->'vulnerable')), '{}'),
    m->>'relative_phone', m->>'note'
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Người dân không được tự đổi vai trò / đội của mình
create or replace function guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.team_id is distinct from old.team_id)
     and coalesce(my_role() = 'commander', false) = false
     and auth.uid() is not null then
    raise exception 'Không có quyền đổi vai trò hoặc đội';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on profiles;
create trigger profiles_guard before update on profiles
  for each row execute function guard_profile_update();

-- Người dân chỉ được sửa vài trường trên SOS của mình
create or replace function guard_sos_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  -- auth.uid() null = chạy từ SQL Editor / service key → bỏ qua kiểm tra
  if auth.uid() is not null and coalesce(my_role(), 'citizen') = 'citizen' then
    if new.status is distinct from old.status and new.status <> 'cancelled' then
      raise exception 'Người dân chỉ được hủy SOS';
    end if;
    if new.assigned_team_id is distinct from old.assigned_team_id
       or new.user_id is distinct from old.user_id then
      raise exception 'Không có quyền';
    end if;
  end if;
  if auth.uid() is not null and my_role() = 'rescuer'
     and new.assigned_team_id is distinct from old.assigned_team_id
     and new.assigned_team_id is distinct from my_team() then
    raise exception 'Cứu hộ chỉ được nhận SOS cho đội mình';
  end if;
  if new.status is distinct from old.status or new.assigned_team_id is distinct from old.assigned_team_id then
    insert into sos_events (sos_id, actor_id, action)
    values (new.id, auth.uid(), new.status::text);
  end if;
  return new;
end $$;

drop trigger if exists sos_guard on sos_requests;
create trigger sos_guard before update on sos_requests
  for each row execute function guard_sos_update();

-- Mỗi người chỉ có 1 SOS đang mở (chống spam)
create unique index if not exists sos_one_open_per_user on sos_requests (user_id)
  where status in ('waiting', 'assigned', 'on_way', 'arrived') and user_id is not null;
create unique index if not exists sos_one_open_per_guest on sos_requests (guest_phone)
  where status in ('waiting', 'assigned', 'on_way', 'arrived') and guest_phone is not null;

-- ---------- RPC ----------
-- SOS khẩn không cần tài khoản
create or replace function create_guest_sos(
  p_name text, p_phone text, p_lat double precision, p_lng double precision,
  p_accuracy double precision, p_battery int, p_people int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if length(coalesce(p_phone, '')) < 9 then raise exception 'Số điện thoại không hợp lệ'; end if;
  insert into sos_requests (guest_name, guest_phone, lat, lng, accuracy, battery, people_count)
  values (left(p_name, 100), left(p_phone, 20), p_lat, p_lng, p_accuracy, p_battery, greatest(coalesce(p_people, 1), 1))
  returning id into new_id;
  return new_id;
end $$;

-- Khách xem trạng thái SOS của mình (chỉ biết id mới xem được)
create or replace function guest_sos_status(p_id uuid)
returns table (status sos_status, team_name text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.status, t.name, s.updated_at
  from sos_requests s left join teams t on t.id = s.assigned_team_id
  where s.id = p_id and s.user_id is null
$$;

-- Chỉ huy cấp vai trò / đội cho một tài khoản theo SĐT
create or replace function set_user_role(p_phone text, p_role user_role, p_team uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if my_role() is distinct from 'commander' then raise exception 'Chỉ chỉ huy được cấp quyền'; end if;
  update profiles set role = p_role, team_id = p_team where phone = p_phone;
  if not found then raise exception 'Không tìm thấy tài khoản có SĐT này'; end if;
end $$;

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table teams enable row level security;
alter table sos_requests enable row level security;
alter table rescuer_locations enable row level security;
alter table sos_events enable row level security;

-- profiles
drop policy if exists "profiles: tự xem" on profiles;
create policy "profiles: tự xem" on profiles for select to authenticated
  using (id = auth.uid() or my_role() = 'commander'
         or (my_role() = 'rescuer' and (team_id = my_team() or id in (
               select user_id from sos_requests where assigned_team_id = my_team()))));
drop policy if exists "profiles: tự sửa" on profiles;
create policy "profiles: tự sửa" on profiles for update to authenticated
  using (id = auth.uid() or my_role() = 'commander');

-- teams: người đã đăng nhập xem được tên đội; chỉ huy quản lý
drop policy if exists "teams: xem" on teams;
create policy "teams: xem" on teams for select to authenticated using (true);
drop policy if exists "teams: chỉ huy" on teams;
create policy "teams: chỉ huy" on teams for all to authenticated
  using (my_role() = 'commander') with check (my_role() = 'commander');
drop policy if exists "teams: đội tự đổi trạng thái" on teams;
create policy "teams: đội tự đổi trạng thái" on teams for update to authenticated
  using (my_role() = 'rescuer' and id = my_team());

-- sos_requests
drop policy if exists "sos: xem" on sos_requests;
create policy "sos: xem" on sos_requests for select to authenticated
  using (user_id = auth.uid()
         or my_role() = 'commander'
         or (my_role() = 'rescuer' and status not in ('rescued', 'cancelled')));
drop policy if exists "sos: tạo" on sos_requests;
create policy "sos: tạo" on sos_requests for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "sos: sửa" on sos_requests;
create policy "sos: sửa" on sos_requests for update to authenticated
  using (user_id = auth.uid()
         or my_role() = 'commander'
         or (my_role() = 'rescuer' and (assigned_team_id = my_team() or assigned_team_id is null
                                        or status = 'cannot_reach')));

-- rescuer_locations
drop policy if exists "loc: xem" on rescuer_locations;
create policy "loc: xem" on rescuer_locations for select to authenticated
  using (user_id = auth.uid() or my_role() in ('commander', 'rescuer'));
drop policy if exists "loc: ghi" on rescuer_locations;
create policy "loc: ghi" on rescuer_locations for all to authenticated
  using (user_id = auth.uid() and my_role() in ('rescuer', 'commander'))
  with check (user_id = auth.uid() and my_role() in ('rescuer', 'commander'));

-- sos_events
drop policy if exists "events: xem" on sos_events;
create policy "events: xem" on sos_events for select to authenticated
  using (my_role() in ('commander', 'rescuer'));
drop policy if exists "events: ghi" on sos_events;
create policy "events: ghi" on sos_events for insert to authenticated
  with check (actor_id = auth.uid() and my_role() in ('commander', 'rescuer'));

-- ---------- Realtime ----------
do $$ begin
  alter publication supabase_realtime add table sos_requests;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table rescuer_locations;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table teams;
exception when duplicate_object then null; end $$;

-- ---------- Cấp quyền chỉ huy đầu tiên (chạy tay, thay SĐT) ----------
-- update profiles set role = 'commander' where phone = '0912345678';
