-- Supabase schema & RLS (same as בגרסת Next)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text check (role in ('admin','editor','viewer')) default 'editor',
  created_at timestamptz default now()
);
create table if not exists public.series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_url text,
  created_at timestamptz default now()
);
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  image_url text,
  audio_url text,
  excerpt text,
  body text,
  is_series boolean default false,
  series_id uuid references public.series(id),
  publish_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists public.memorials (
  id uuid primary key default gen_random_uuid(),
  honoree text not null,
  note text,
  story_id uuid references public.stories(id),
  event_date date,
  created_at timestamptz default now()
);
create table if not exists public.faq (
  id bigint generated always as identity primary key,
  question text not null,
  answer text not null,
  order_index int default 0,
  created_at timestamptz default now()
);

-- Tags and story-tags (many-to-many)
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);
create table if not exists public.story_tags (
  story_id uuid not null references public.stories(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (story_id, tag_id)
);
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.series enable row level security;
alter table public.memorials enable row level security;
alter table public.faq enable row level security;
alter table public.contact_messages enable row level security;
alter table public.tags enable row level security;
alter table public.story_tags enable row level security;
-- Memorials policies
create policy if not exists "public read memorials" on public.memorials for select using ( true );
create policy if not exists "staff write memorials" on public.memorials for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
) with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);
create policy if not exists "read published stories" on public.stories for select using ( coalesce(publish_at <= now(), true) );
create policy if not exists "edit stories by staff" on public.stories for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
) with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);
create policy if not exists "staff read/write series" on public.series for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
) with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);
create policy if not exists "public read faq" on public.faq for select using ( true );
create policy if not exists "staff write faq" on public.faq for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
) with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);
create policy if not exists "anyone can create contact" on public.contact_messages for insert with check ( true );
create policy if not exists "staff read contacts" on public.contact_messages for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);

-- Tags policies
create policy if not exists "public read tags" on public.tags for select using ( true );
create policy if not exists "staff write tags" on public.tags for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
) with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);
create policy if not exists "public read story_tags" on public.story_tags for select using ( true );
create policy if not exists "staff write story_tags" on public.story_tags for all using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
) with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','editor'))
);
