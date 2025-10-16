-- Enum y tabla
create type category as enum ('RUMOR', 'REPORTE');

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category category not null,
  title text not null,
  content text not null,
  barrio text,
  imagen_url text,
  status text not null default 'pending', -- pending | approved | rejected
  rejection_reason text,
  score int not null default 0
);

create index on public.submissions (status, created_at desc);
create index on public.submissions (category, status);

alter table public.submissions enable row level security;

-- Lectura pública de aprobados
create policy public_read_approved on public.submissions
for select using (status = 'approved');

-- Inserción anónima
create policy anonymous_insert on public.submissions
for insert with check (true);

-- Bloquear updates/deletes públicos
create policy no_public_update on public.submissions for update using (false);
create policy no_public_delete on public.submissions for delete using (false);
