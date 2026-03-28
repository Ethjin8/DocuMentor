-- Run this in your Supabase SQL editor to set up the database

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
alter table public.documents enable row level security;
alter table public.faqs enable row level security;
alter table public.research_results enable row level security;

create policy "Allow all for now" on public.documents for all using (true);
create policy "Allow all for now" on public.faqs for all using (true);
create policy "Allow all for now" on public.research_results for all using (true);
