-- =========================================================
-- Boastdrink — Supabase schema (clean install)
-- 貼到 Supabase SQL Editor → Run
-- 這版會先 DROP 舊表,再重建,避免殘留衝突
-- =========================================================

-- ---------- Tear down any prior attempt ----------
drop table if exists history cascade;
drop table if exists dice    cascade;
drop table if exists players cascade;
drop table if exists rooms   cascade;
drop function if exists purge_expired_rooms;

-- ---------- Tables ----------

create table rooms (
  code            text primary key,
  host_id         uuid not null,
  dice_count      int  not null default 5,
  blessed         boolean not null default true,
  phase           text not null default 'lobby',
  round           int  not null default 0,
  shake_idx       int  not null default 0,
  bidder_idx      int  not null default 0,
  current_bid     jsonb,
  ones_locked     boolean not null default false,
  result          jsonb,
  continue_votes  jsonb not null default '{}'::jsonb,
  blessed_holder  uuid,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '24 hours'
);

create table players (
  id          uuid primary key,
  room_code   text not null references rooms(code) on delete cascade,
  name        text not null,
  color_idx   int  not null default 0,
  is_host     boolean not null default false,
  drinks      int  not null default 0,
  order_idx   int  not null default 0,
  last_seen   timestamptz not null default now(),
  joined_at   timestamptz not null default now()
);

create index players_room_idx on players(room_code);

create table dice (
  room_code   text not null references rooms(code) on delete cascade,
  player_id   uuid not null,
  values      int[] not null default '{}',
  shaken      boolean not null default false,
  viewed      boolean not null default false,
  primary key (room_code, player_id)
);

create table history (
  id          bigserial primary key,
  room_code   text not null references rooms(code) on delete cascade,
  round       int  not null,
  bid         jsonb not null,
  challenger  text not null,
  challenged  text not null,
  loser       text not null,
  actual      int  not null,
  created_at  timestamptz not null default now()
);

create index history_room_idx on history(room_code, created_at desc);

-- ---------- Row-Level Security (permissive; no anti-cheat) ----------
alter table rooms    enable row level security;
alter table players  enable row level security;
alter table dice     enable row level security;
alter table history  enable row level security;

create policy "anon all rooms"   on rooms   for all to anon using (true) with check (true);
create policy "anon all players" on players for all to anon using (true) with check (true);
create policy "anon all dice"    on dice    for all to anon using (true) with check (true);
create policy "anon all history" on history for all to anon using (true) with check (true);

-- ---------- Realtime publication ----------
-- Safely add each table; ignore duplicates.
do $$
begin
  begin alter publication supabase_realtime add table rooms;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table players; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table dice;    exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table history; exception when duplicate_object then null; end;
end $$;

-- ---------- Helper: purge expired rooms ----------
create or replace function purge_expired_rooms() returns void as $$
  delete from rooms where expires_at < now();
$$ language sql;
