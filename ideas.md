# IDEAS — Pestaña Pensamientos

> Este archivo lo generó una sesión de análisis previa. Leélo antes de arrancar.
> Contiene el diseño completo de la pestaña Pensamientos: modelo mental, UX, DB y fases.

---

## El problema que resuelve

El cerebro TDAH no diferencia en urgencia entre una tarea y una emoción fuerte: las dos "gritan" igual.
Resultado: mente en dos lugares a la vez, saturación, procrastinación, culpa.

**El sistema tiene que separar esas dos cosas en la puerta de entrada** y hacer que cada una termine en lo mismo: o una acción con fecha, o un soltar consciente. Nada queda flotando → bandeja vacía = mente en calma.

Marcos probados en los que se basa:
- **Dicotomía del control** (estoicos): ¿lo puedo controlar o no?
- **Worry Tree** (CBT clínico): preocupación → plan con fecha, o soltar.
- **Capturar / Aclarar** (GTD): suelto rápido ahora, proceso cuando estoy tranquilo.

---

## Mapa de responsabilidades (para no superponer pestañas)

| Pieza | Pregunta que responde | Horizonte | Dónde vive |
|---|---|---|---|
| **Pensamiento / Emoción** | "¿Qué tengo en la mente?" | Ahora mismo | Pensamientos (bandeja) |
| **Tarea** | "¿Qué hago al respecto?" | Un día | Estructura / Inicio |
| **Hábito** | "¿En quién me quiero convertir?" | Meses | Montaña |
| **Rutina / Bloque** | "¿Qué toca ahora?" | Hoy | Estructura |
| **Emoción soltada** | "¿Qué me pasa y con qué frecuencia?" | Histórico | Pensamientos (registro) |

**Regla de oro:** Pensamientos *captura y deriva*, nunca ejecuta. Es la RAM de la cabeza que se vacía de un toque. Estructura ejecuta el tiempo. Montaña mide la repetición.

---

## Cómo funciona — los dos carriles

### Carril A — Captura (1 toque, siempre disponible)

Botón flotante **"Soltar"** visible en todas las pestañas. Escribís lo que sea (tarea o emoción, da igual) y se guarda en la **bandeja**. No hay que clasificar nada en el momento de la angustia. Solo sacar de la cabeza.

### Carril B — Procesar (cuando estás más tranquilo)

Cada ítem de la bandeja te hace una pregunta de clasificación:

- **"Es algo para hacer"** → paso más chico + fecha → (opcional) mandar a Estructura como bloque o queda como tarea del día.
- **"Es algo que siento / me da vueltas"** → entra al flujo introspectivo:

```
1. NOMBRAR
   → "¿Qué sentís? ¿Qué lo disparó?"
   → etiqueta: ansiedad / culpa / bronca / miedo / tristeza
   → intensidad: 1–5
   (solo escribirlo y nombrarlo ya baja — "name it to tame it")

2. ¿LO CONTROLO?  ← la pregunta bisagra
   │
   ├─ SÍ ──→ "¿Cuál es el paso más chico que podés dar?"
   │         → acción + FECHA
   │         → (opcional) mandar a Estructura / crear hábito
   │         Ej: "me preocupa la plata" → "listar gastos fijos" → mañana 18:00 ✓
   │
   └─ NO ──→ "Esto no está en tus manos hoy. ¿Lo soltás?"
             → se registra como preocupación reconocida y archivada
             → la app te devuelve al presente:
               "Volvé a lo tuyo: Estudiar — faltan 42 min ⏳"

3. (Opcional) ¿Es real o hipotético?  → "¿y si...?" sin base → soltar.

4. REGISTRO → emoción + intensidad + fecha → alimenta resumen mensual.
```

---

## UX — cómo se ve (estilo Montaña: oscuro, vertical, sin ruido)

```
┌─────────────────────────────────────────────┐
│  💭 Pensamientos                              │
│                                              │
│  ┌─ Bandeja (3 sin procesar) ─────────────┐ │
│  │ • "no llego con la plata este mes"  💭  │ │  ← toque = procesar
│  │ • "llamar al contador"              📋  │ │
│  │ • "y si el bot se cae el finde..."  💭  │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ── Esta semana ─────────────────────────    │
│   Resueltas con acción   ▓▓▓▓▓▓░░  6        │
│   Soltadas (no control)  ▓▓▓░░░░░  3        │
│   Emoción más repetida:  ansiedad · plata   │
│                                              │
│  ── Registro ────────────────────────────    │
│   lun · ansiedad (4) · plata · → soltado    │
│   dom · culpa (3) · no estudié · → acción   │
│                                              │
│                                   [ + Soltar]│ ← botón flotante, global
└─────────────────────────────────────────────┘
```

Principios TDAH (los mismos del MAPA.md):
- Un toque para capturar.
- Siempre el próximo paso visible.
- Nunca pantalla en blanco.
- El cierre se siente (barras de resueltas/soltadas suben, como el acumulado de la Montaña).

---

## Modelo de datos

Crear tabla `thoughts` (nueva, no tocar `ideas` existente — `ideas` queda para el Estacionamiento de la pestaña Estructura).

```sql
create table if not exists thoughts (
  id               uuid primary key default gen_random_uuid(),
  text             text not null,
  kind             text check (kind in ('task','emotion','note')) default null, -- null = sin procesar
  emotion          text check (emotion in ('ansiedad','culpa','bronca','miedo','tristeza','otra')),
  intensity        int  check (intensity between 1 and 5),
  controllable     boolean,
  status           text not null default 'inbox' check (status in ('inbox','action','released','archived')),
  action_text      text,          -- el "paso más chico"
  due_date         date,          -- fecha de la acción
  linked_block_id  uuid references blocks(id) on delete set null,
  linked_habit_id  uuid references habits(id) on delete set null,
  processed_at     timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists thoughts_status_idx on thoughts (status, created_at desc);
create index if not exists thoughts_emotion_idx on thoughts (emotion, created_at desc);

alter table thoughts disable row level security;
grant all on table thoughts to anon, authenticated;
```

---

## Fases de implementación (una marcha a la vez)

| Fase | Qué entrega | Valor inmediato |
|---|---|---|
| **A — La bandeja** | Botón "Soltar" global + lista de bandeja (inbox) | "Lo saqué de la cabeza" — vacía la mente hoy |
| **B — Triage** | Botones tarea / emoción / nota / descartar + acción con fecha | Cierra el loop acción + fecha |
| **C — Flujo introspectivo** | El wizard guiado (nombrar → ¿controlo? → acción / soltar) | El acompañamiento terapéutico |
| **D — Patrones** | Historial + resumen mensual de emociones y disparadores | Muestra recurrentes para mejorar |
| **E — Integración fina** | Tareas aparecen en Inicio, pensamiento→hábito, "X sin procesar" en sidebar | Todo conectado |

**Arrancar por Fase A.** La sola bandeja ya justifica todo.

---

## Decisiones pendientes (resolver antes de codear)

1. **Tareas sin hora:** hoy toda "tarea" necesita ser un bloque con horario en Estructura. Una preocupación muchas veces da una tarea con fecha pero sin hora ("esta semana llamar al contador"). ¿Se permiten tareas con fecha sin horario que aparezcan en Inicio, o forzamos que todo tenga hora?
   - Recomendación: **permitir tareas sin hora** (menos fricción, más realista).

2. **Tabla `ideas` vs. `thoughts`:** el schema ya tiene `ideas` "pensada para alimentar Pensamientos". Es más limpio crear `thoughts` con el modelo rico y dejar `ideas` para el Estacionamiento de la pestaña Estructura.
   - Recomendación: **`thoughts` nueva**.
