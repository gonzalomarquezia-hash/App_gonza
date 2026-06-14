-- ╔══════════════════════════════════════════════════════════╗
-- ║  Tu montaña — esquema MVP (Fase 1)                         ║
-- ║  Pegá TODO esto en Supabase → SQL Editor → Run            ║
-- ╚══════════════════════════════════════════════════════════╝

create table if not exists habits (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null default 'do' check (type in ('do','avoid')),
  camps         jsonb not null default '[{"day":7,"reward":""},{"day":30,"reward":""},{"day":90,"reward":""}]'::jsonb,
  base_reset_at timestamptz not null default now(),
  lifetime_days int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists checkins (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references habits(id) on delete cascade,
  day        date not null,
  state      text not null default 'done' check (state in ('done','rest')),
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);

-- MVP: un solo usuario, sin login todavía. Sin RLS por ahora.
-- (Antes de sumar hábitos sensibles agregamos auth + RLS.)
alter table habits   disable row level security;
alter table checkins disable row level security;
grant all on table habits   to anon, authenticated;
grant all on table checkins to anon, authenticated;

-- Semilla: tu primer hábito (solo si la tabla está vacía).
insert into habits (name, type)
select 'Ejercicio diario', 'do'
where not exists (select 1 from habits);
