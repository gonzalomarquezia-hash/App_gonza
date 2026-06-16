'use client';

import type { ActiveBlockInfo } from '@/lib/types';
import { fmtDuration } from '@/lib/estructura';

// Reloj grande. mode 'up' = transcurrido del bloque · 'down' = restante.
export default function BigTimer({
  info,
  mode,
  size = 'md',
}: {
  info: ActiveBlockInfo;
  mode: 'up' | 'down';
  size?: 'md' | 'xl';
}) {
  const secs = mode === 'up' ? info.elapsedSec : info.remainingSec;
  const cls = size === 'xl' ? 'text-7xl md:text-8xl' : 'text-6xl md:text-7xl';
  return (
    <span className={`font-mono font-semibold tabular-nums tracking-tight ${cls}`}>
      {fmtDuration(secs)}
    </span>
  );
}
