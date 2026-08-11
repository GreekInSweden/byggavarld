-- Kör detta i Supabase SQL editor för ditt projekt.
-- OBS: RLS-policyn nedan är medvetet öppen (ingen inloggning krävs) eftersom
-- detta är en testprototyp för dig och din son. Innan det här går till fler
-- personer bör policyn begränsas till world_id/ägare, precis som ni gjorde
-- säkerhetsöversynen i Kan Du Alla.

create extension if not exists "pgcrypto";

create table if not exists builds (
  id uuid primary key default gen_random_uuid(),
  world_id text not null default 'default',
  name text not null,
  category text not null check (category in ('fordon', 'varelse', 'byggnad', 'dekoration', 'karaktar')),
  image_url text,
  pos_x float8 not null,
  pos_z float8 not null,
  created_at timestamptz not null default now()
);

alter table builds enable row level security;

create policy "Anyone can read builds"
  on builds for select
  using (true);

create policy "Anyone can insert builds"
  on builds for insert
  with check (true);

-- Kör separat i Supabase Dashboard > Storage:
-- Skapa en bucket som heter "builds" och gör den public,
-- så att uppladdade bilder går att visa direkt via image_url.
