import type { ReactNode } from 'react';

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl px-5 py-8">{children}</div>;
}

export function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
      <p className="mb-1 font-medium">Todavía no puedo leer la base.</p>
      <p className="text-amber-200/80">
        Probablemente faltan crear las tablas. Corré el SQL de <code>supabase/schema.sql</code> en
        el editor SQL de Supabase y recargá.
      </p>
      <p className="mt-2 break-all text-amber-200/50">({msg})</p>
    </div>
  );
}
