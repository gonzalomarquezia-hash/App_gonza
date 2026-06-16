-- ╔══════════════════════════════════════════════════════════╗
-- ║  Tu montaña — esquema MVP (Fase 1)                         ║
-- ║  Pegá TODO esto en Supabase → SQL Editor → Run            ║
-- ╚══════════════════════════════════════════════════════════╝

create table if not exists habits (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          text not null default 'do' check (type in ('do','avoid')),
  camps         jsonb not null default '[{"day":7,"reward":""},{"day":30,"reward":""},{"day":90,"reward":""}]'::jsonb,
  week_days     jsonb not null default '[0,1,2,3,4,5,6]'::jsonb,
  start_time    time,
  end_time      time,
  duration_min  int,
  base_reset_at timestamptz not null default now(),
  lifetime_days int not null default 0,
  created_at    timestamptz not null default now()
);
-- Migración para tablas ya creadas (Fase 3): días de la semana del hábito.
alter table habits add column if not exists week_days jsonb not null default '[0,1,2,3,4,5,6]'::jsonb;
-- Fase 4: condición de horario del hábito (alimenta el recordatorio a futuro).
-- start_time = hora de inicio; end_time = modo ventana; duration_min = modo temporizador.
alter table habits add column if not exists start_time   time;
alter table habits add column if not exists end_time     time;
alter table habits add column if not exists duration_min int;

create table if not exists checkins (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references habits(id) on delete cascade,
  day        date not null,
  state      text not null default 'done' check (state in ('done','miss')),
  created_at timestamptz not null default now(),
  unique (habit_id, day)
);
-- Fase 4: el estado pasa de done/rest → done/miss.
-- El descanso ya no se marca a mano: lo definen los días de la semana del hábito.
alter table checkins drop constraint if exists checkins_state_check;
delete from checkins where state = 'rest';
alter table checkins add constraint checkins_state_check check (state in ('done','miss'));

-- Fase 4: unificamos los hábitos "no hacer" al mismo modelo de calendario.
-- Rellenamos su racha actual (días limpios desde la última base) como "hecho".
-- Idempotente: no pisa días que ya marcaste a mano.
insert into checkins (habit_id, day, state)
select h.id, d::date, 'done'
from habits h
cross join lateral generate_series(date(h.base_reset_at), current_date, interval '1 day') as d
where h.type = 'avoid'
on conflict (habit_id, day) do nothing;

-- Notas atadas a un hábito (Fase 2 · Paso 3). Cómo me fue, anotaciones del día.
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references habits(id) on delete cascade,
  day        date not null default current_date,
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists notes_habit_idx on notes (habit_id, created_at desc);

-- MVP: un solo usuario, sin login todavía. Sin RLS por ahora.
-- (Antes de sumar hábitos sensibles agregamos auth + RLS.)
alter table habits   disable row level security;
alter table checkins disable row level security;
alter table notes    disable row level security;
grant all on table habits   to anon, authenticated;
grant all on table checkins to anon, authenticated;
grant all on table notes    to anon, authenticated;

-- Semilla: tu primer hábito (solo si la tabla está vacía).
insert into habits (name, type)
select 'Ejercicio diario', 'do'
where not exists (select 1 from habits);

-- ╔══════════════════════════════════════════════════════════╗
-- ║  Estructura — bloques de trabajo con timer (Fase 5)        ║
-- ╚══════════════════════════════════════════════════════════╝

-- Rutina = plan de bloques para un contexto. is_active = la que se muestra hoy.
create table if not exists routines (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                 -- "Casa", "Local"
  context     text not null default 'casa',  -- 'casa' | 'local' (libre)
  is_active   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Bloque con HORA FIJA. fin = start_time + duration_min (no se guarda el fin).
create table if not exists blocks (
  id            uuid primary key default gen_random_uuid(),
  routine_id    uuid not null references routines(id) on delete cascade,
  name          text not null,
  description   text,
  start_time    time not null default '08:00',
  duration_min  int  not null default 30,
  pos           int  not null default 0,        -- desempate / orden visual
  habit_id      uuid references habits(id) on delete set null,
  kind          text not null default 'task' check (kind in ('task','habit','break')),
  created_at    timestamptz not null default now()
);
create index if not exists blocks_routine_idx on blocks (routine_id, start_time);

-- Corrimiento del día (aplazar todo). Una fila por (rutina, día). Se resetea solo mañana.
create table if not exists routine_day_state (
  id          uuid primary key default gen_random_uuid(),
  routine_id  uuid not null references routines(id) on delete cascade,
  day         date not null default current_date,
  offset_min  int  not null default 0,
  created_at  timestamptz not null default now(),
  unique (routine_id, day)
);

-- "Hecho" de un bloque por día. unique(block_id, day) como checkins.
create table if not exists block_log (
  id         uuid primary key default gen_random_uuid(),
  block_id   uuid not null references blocks(id) on delete cascade,
  day        date not null default current_date,
  done       boolean not null default true,
  created_at timestamptz not null default now(),
  unique (block_id, day)
);

-- Ideas capturadas (el "ya lo guardé"). Tabla general (la tabla notes exige habit_id
-- NOT NULL, no sirve). Pensada para alimentar la futura pestaña "Pensamientos".
create table if not exists ideas (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,
  day         date not null default current_date,
  block_id    uuid references blocks(id) on delete set null,
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ideas_created_idx on ideas (created_at desc);

alter table routines          disable row level security;
alter table blocks            disable row level security;
alter table routine_day_state disable row level security;
alter table block_log         disable row level security;
alter table ideas             disable row level security;
grant all on table routines          to anon, authenticated;
grant all on table blocks            to anon, authenticated;
grant all on table routine_day_state to anon, authenticated;
grant all on table block_log         to anon, authenticated;
grant all on table ideas             to anon, authenticated;

-- Semilla: una rutina "Casa" + bloques de ejemplo (solo si no hay rutinas).
insert into routines (name, context, is_active)
select 'Casa', 'casa', true where not exists (select 1 from routines);

insert into blocks (routine_id, name, description, start_time, duration_min, pos, kind)
select r.id, x.name, x.descr, x.st::time, x.dur, x.pos, 'task'
from routines r,
  (values ('Estudiar','Bloque de foco','08:00',90,0),
          ('Bañarme','Pausa','09:30',30,1),
          ('Ocio','Descanso','10:00',60,2),
          ('Cocinar','Almuerzo','11:00',45,3)) as x(name, descr, st, dur, pos)
where r.is_active and not exists (select 1 from blocks);

-- Mini-tareas (checklist) de un bloque. Plantilla: se repiten cada día.
create table if not exists block_items (
  id          uuid primary key default gen_random_uuid(),
  block_id    uuid not null references blocks(id) on delete cascade,
  text        text not null,
  pos         int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists block_items_block_idx on block_items (block_id, pos);

-- Tildado de cada mini-tarea por día (se resetea de noche). unique(item_id, day).
create table if not exists block_item_log (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references block_items(id) on delete cascade,
  day        date not null default current_date,
  done       boolean not null default true,
  created_at timestamptz not null default now(),
  unique (item_id, day)
);

alter table block_items    disable row level security;
alter table block_item_log disable row level security;
grant all on table block_items    to anon, authenticated;
grant all on table block_item_log to anon, authenticated;

-- Horario de un hábito POR contexto/rutina. Alimenta la proyección: un hábito
-- con horario en una rutina aparece como bloque del día en esa rutina.
create table if not exists habit_schedules (
  id           uuid primary key default gen_random_uuid(),
  habit_id     uuid not null references habits(id) on delete cascade,
  routine_id   uuid not null references routines(id) on delete cascade,
  start_time   time not null,
  duration_min int  not null default 30,
  created_at   timestamptz not null default now(),
  unique (habit_id, routine_id)
);
create index if not exists habit_schedules_routine_idx on habit_schedules (routine_id);

alter table habit_schedules disable row level security;
grant all on table habit_schedules to anon, authenticated;

-- Ventana del día (despertar/dormir) por rutina, default; ajustable por día.
alter table routines add column if not exists day_start_time time not null default '08:00';
alter table routines add column if not exists day_end_time   time not null default '00:00';

-- Override de la ventana del día solo para un día concreto.
alter table routine_day_state add column if not exists day_start_override time;
alter table routine_day_state add column if not exists day_end_override   time;

-- Ediciones de un bloque (o hábito proyectado) SOLO para un día: sacarlo, moverlo,
-- o cambiar su duración, sin tocar la rutina/hábito base.
create table if not exists block_day_edits (
  id                uuid primary key default gen_random_uuid(),
  day               date not null,
  routine_id        uuid not null references routines(id) on delete cascade,
  ref_type          text not null check (ref_type in ('block','habit')),
  ref_id            uuid not null,
  skipped           boolean not null default false,
  start_override    time,
  duration_override int,
  created_at        timestamptz not null default now(),
  unique (day, ref_type, ref_id)
);
create index if not exists block_day_edits_idx on block_day_edits (routine_id, day);
alter table block_day_edits disable row level security;
grant all on table block_day_edits to anon, authenticated;

-- ╔══════════════════════════════════════════════════════════╗
-- ║  Pensamientos y tareas (bandeja de la cabeza)             ║
-- ╚══════════════════════════════════════════════════════════╝
-- Capturás de un toque (tarea o pensamiento/emoción) y queda acá. Después,
-- tranquilo, lo procesás: una tarea con fecha, o un soltar consciente.
-- Tabla nueva (no toca `ideas`, que queda para el estacionamiento de Estructura).
create table if not exists thoughts (
  id               uuid primary key default gen_random_uuid(),
  text             text not null,
  kind             text check (kind in ('task','emotion','note')),     -- null = sin clasificar
  emotion          text check (emotion in ('ansiedad','culpa','bronca','miedo','tristeza','otra')),
  intensity        int  check (intensity between 1 and 5),
  controllable     boolean,
  status           text not null default 'inbox'
                     check (status in ('inbox','action','released','done','archived')),
  action_text      text,          -- el "paso más chico"
  due_date         date,          -- fecha de la acción (puede no tener hora)
  linked_block_id  uuid references blocks(id) on delete set null,
  linked_habit_id  uuid references habits(id) on delete set null,
  processed_at     timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists thoughts_status_idx  on thoughts (status, created_at desc);
create index if not exists thoughts_emotion_idx on thoughts (emotion, created_at desc);

alter table thoughts disable row level security;
grant all on table thoughts to anon, authenticated;
