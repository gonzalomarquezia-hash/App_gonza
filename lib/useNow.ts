'use client';

import { useEffect, useState } from 'react';

// Devuelve Date.now() refrescado cada `ms`. El intervalo solo dispara re-render;
// el valor real sale del reloj de pared, así que es robusto a pestañas en segundo
// plano: al volver, salta al valor correcto en vez de atrasarse acumulando ticks.
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
