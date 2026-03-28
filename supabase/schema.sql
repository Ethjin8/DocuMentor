-- Run this in your Supabase SQL editor to set up the database

-- User profiles table
-- Created automatically after sign-up via trigger
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  email         text not null,
  region        text not null,
  reading_level smallint not null default 2 check (reading_level between 1 and 3),
  -- 1 = Simple  2 = Intermediate  3 = Advanced
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, region, reading_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'region', ''),
    coalesce((new.raw_user_meta_data->>'reading_level')::smallint, 2)
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Documents table
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  file_name   text not null,
  file_url    text default '',
  raw_text    text not null,
  category    text,
  created_at  timestamptz default now()
);

-- FAQs table
create table if not exists public.faqs (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid references public.documents(id) on delete cascade,
  summary      text not null,
  items        jsonb not null default '[]',
  key_dates    jsonb not null default '[]',
  obligations  jsonb not null default '[]',
  created_at   timestamptz default now()
);

-- Research results table
create table if not exists public.research_results (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid references public.documents(id) on delete cascade,
  query        text not null,
  findings     text not null,
  sources      jsonb not null default '[]',
  created_at   timestamptz default now()
);

-- Storage bucket for documents
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict do nothing;

-- Row level security (permissive for hackathon — tighten for prod)
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.faqs enable row level security;
alter table public.research_results enable row level security;

-- Profiles: users can only read/update their own row
create policy "Users can view own profile"   on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Allow all for now" on public.documents for all using (true);
create policy "Allow all for now" on public.faqs for all using (true);
create policy "Allow all for now" on public.research_results for all using (true);
