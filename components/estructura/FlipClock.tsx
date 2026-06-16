'use client';

// Reloj tipo "flip" (tarjetas). Recibe un string ya formateado, ej "04:06" o
// "1:04:06". Cada dígito es una tarjeta con la línea de doblez en el medio; al
// cambiar, el dígito hace una pequeña animación de vuelta.
export default function FlipClock({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-3">
      {value.split('').map((c, i) =>
        c === ':' ? (
          <div key={i} className="w-1 md:w-3" aria-hidden />
        ) : (
          <div key={i} className="flip-card">
            {/* key={c} fuerza el remonte para disparar la animación al cambiar */}
            <span key={c} className="flip-digit">
              {c}
            </span>
          </div>
        ),
      )}
    </div>
  );
}
