-- Nice Barber CRM schema
-- Run in Supabase SQL Editor first

create extension if not exists "pgcrypto";

create table if not exists barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  price numeric(10,2) not null,
  duration_minutes integer not null,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete restrict,
  barber_id uuid not null references barbers(id) on delete restrict,
  service_id uuid not null references services(id) on delete restrict,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  status text not null check (status in ('confirmed', 'completed', 'cancelled', 'no_show')),
  rescheduled_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists barber_time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers(id) on delete cascade,
  date date not null,
  reason text,
  unique (barber_id, date)
);

create index if not exists bookings_barber_date_idx on bookings (barber_id, booking_date);
create index if not exists bookings_client_idx on bookings (client_id);
create index if not exists bookings_date_idx on bookings (booking_date);
create index if not exists barber_time_off_barber_date_idx on barber_time_off (barber_id, date);

alter table barbers enable row level security;
alter table services enable row level security;
alter table clients enable row level security;
alter table bookings enable row level security;
alter table barber_time_off enable row level security;

create policy "Authenticated full access on barbers"
  on barbers for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access on services"
  on services for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access on clients"
  on clients for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access on bookings"
  on bookings for all to authenticated
  using (true) with check (true);

create policy "Authenticated full access on barber_time_off"
  on barber_time_off for all to authenticated
  using (true) with check (true);
