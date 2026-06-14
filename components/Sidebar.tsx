'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/montana', label: 'Montaña', icon: '🏔️' },
  { href: '/habitos', label: 'Hábitos', icon: '✅' },
];

const soon = [
  { label: 'Proyectos', icon: '📁' },
  { label: 'Pensamientos', icon: '📝' },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="shrink-0 border-b border-white/10 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="px-5 py-4 text-lg font-semibold">🏔️ Tu montaña</div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col">
        {items.map((it) => {
          const active = path === it.href;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <span>{it.icon}</span>
              {it.label}
            </Link>
          );
        })}
        {soon.map((it) => (
          <span
            key={it.label}
            className="flex cursor-default items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-slate-600"
          >
            <span className="opacity-50">{it.icon}</span>
            {it.label}
            <span className="ml-auto rounded border border-slate-700 px-1 text-[10px] uppercase tracking-wide">
              pronto
            </span>
          </span>
        ))}
      </nav>
    </aside>
  );
}
