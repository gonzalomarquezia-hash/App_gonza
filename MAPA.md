# 🏔️ MAPA — Tu montaña

App personal de hábitos, anti-hábitos y proyectos para Gonza.
Pensada para un cerebro con TDAH: visual, vertical, sin ruido, con el progreso siempre a la vista.

> Este archivo es la **única fuente de verdad**. Cada sesión arranca leyéndolo.
> Si aparece una idea nueva o un impulso → va al **Estacionamiento de ideas**, no se construye en el momento.

---

## 🧭 Principios (no se negocian)
1. Mostrar siempre **EL próximo paso** (uno). Nunca una pantalla en blanco.
2. El progreso **se acumula y casi nunca baja**.
3. Registrar es **un toque**. Cero fricción.
4. **Una marcha a la vez**: no se abre el paso 2 hasta que el 1 está vivo.

---

## ⚙️ Decisiones tomadas (stack)
- **Frontend:** Next.js, desplegado en **Vercel** (web).
- **Datos:** **Supabase** (persistencia real, nada improvisado).
- **Camino:** web ahora → empaquetar como **APK de Android** después.
- **Recaída:** REALISTA. Si recaés, volvés a la **base**. Sin "días congelados", sin vidas, sin bonos. Que pese.
- **Recompensas:** las define Gonza, por campamento, para hábitos de **HACER** y de **NO HACER**.

---

## 🗺️ Visión completa (el destino — no todo se construye ya)

Panel lateral con pestañas:

### 1. Inicio (Dashboard)
- Hábitos de hoy, con check-in de un toque.

### 2. Montaña
- Animación con un **personaje que sube**.
- Arriba: **seleccionable** de qué hábito estoy viendo (NO una sola montaña para todo).
- **Campamentos** en la montaña (hitos en días). Touch en un campamento → muestra: hábito/meta, **días restantes** hasta llegar, y la **recompensa**.
- Aplica a hábitos de HACER y de NO HACER.

### 3. Proyectos
- Para proyectos de desarrollo (ej. el bot de WhatsApp).
- Vista tipo **repositorios de GitHub**: varios proyectos, cada uno con **% completado** general.
- Al entrar → se separa en **áreas / fases**.
- **Flexible**: no obliga a avanzar estrictamente área por área (si una parte está trabada, avanzás otra).

### 4. Pensamientos / Anotaciones
- Notas de texto del día a día.
- Comentarios atados a un hábito (ej. cómo me fue con "ejercicio diario" hoy).
- A fin de mes: **resumen / detección de patrones** para mejorar. No invasivo.

### 5. Hábitos (gestión)
- Agregar / sacar hábitos.
- Detalles, **etapas o fases** por hábito.
- Notas que quedan guardadas.

### Mecánicas transversales
- **Número acumulado que NUNCA baja** (progreso de toda la vida).
- Check-in flexible para HACER: **Hecho / Descanso** (el descanso es elección consciente y no rompe la racha — no es un bono tramposo).
- **Fechas límite** (deadlines).
- **Temporizadores hacia adelante Y hacia atrás** (ej. "pesar 70 kg antes de fin de año" → cuenta regresiva de días; por fases: 65 → 72 → …; y "qué tengo que hacer para llegar").

---

## ✅ Fase 1 — MVP ("la montaña que funciona")
Objetivo: verla andando en la tablet en **días**, fea pero viva. Primer campamento = esto deployado.

- [x] Proyecto Supabase creado. Esquema en `supabase/schema.sql` (FALTA correrlo en Supabase).
- [x] Esqueleto Next.js + panel lateral (Inicio, Montaña, Hábitos activos; Proyectos y Pensamientos en gris "pronto").
- [x] Crear hábito: nombre + tipo (HACER / NO HACER).  → pestaña Hábitos
- [x] Campamentos por hábito (7 / 30 / 90 días) + recompensa de texto editable.
- [x] Montaña: seleccionable + personaje en su altura + campamentos; touch → meta, días restantes, recompensa.
- [x] Inicio: check-in de hoy (Hecho/Descanso para HACER; "Recaí" para NO HACER).
- [x] Recaída realista (NO HACER vuelve a base; lo subido pasa al acumulado).
- [x] Número acumulado que nunca baja, visible.
- [x] Gate simple de acceso (1 contraseña vía `proxy.ts` + `/entrar`; auth real va después).
- [x] Correr `supabase/schema.sql` en Supabase.
- [x] Deploy en Vercel (importar repo + setear las 2 variables NEXT_PUBLIC).

**✅ Fase 1 COMPLETA — MVP vivo y privado en Vercel.**

---

## 🅿️ Estacionamiento de ideas (Fases siguientes — guardadas, NO ahora)
- Pestaña **Proyectos** completa (estilo GitHub, % + áreas/fases flexibles, atada a hábitos).
- Pestaña **Pensamientos** + notas por hábito + **resumen mensual** con patrones.
- **Etapas / fases** por hábito; pantalla de detalle por hábito.
- **Deadlines + temporizadores** adelante/atrás (caso peso 70 kg, por fases).
- **Animaciones** más ricas del personaje y la montaña.
- **Auth real** + multi-dispositivo pulido.
- **Empaquetado Android** (PWA → APK o Capacitor).
- _(acá van los impulsos futuros)_

---

## 👉 Próximo paso (uno)
Fase 1 cerrada. Elegir UN destino de la lista del estacionamiento para la Fase 2
(recomendado: empezar por lo más usado a diario, no por lo más ambicioso).
