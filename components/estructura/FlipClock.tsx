'use client';

// Reloj tipo "flip". Recibe un string ya formateado, ej "04:06" o "17:18:36".
// Los ":" se dibujan como los dos puntos típicos de reloj; cada dígito hace una
// pequeña animación al cambiar.
export default function FlipClock({ value }: { value: string }) {
  return (
    <div className="flip-clock">
      {value.split('').map((c, i) =>
        c === ':' ? (
          <span key={i} className="flip-colon" aria-hidden>
            <span className="flip-dot" />
            <span className="flip-dot" />
          </span>
        ) : (
          <span key={i} className="flip-card">
            <span key={c} className="flip-digit">
              {c}
            </span>
          </span>
        ),
      )}
    </div>
  );
}
