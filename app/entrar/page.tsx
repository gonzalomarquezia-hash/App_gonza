import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Entrar · Tu montaña' };

const UN_AÑO = 60 * 60 * 24 * 365;

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function entrar(formData: FormData) {
    'use server';
    const pass = String(formData.get('pass') ?? '');

    if (!process.env.GATE_PASSWORD || pass !== process.env.GATE_PASSWORD) {
      redirect('/entrar?error=1');
    }

    const store = await cookies();
    store.set('gate', pass, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: UN_AÑO,
    });

    redirect('/');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 px-5">
      <form action={entrar} className="w-full max-w-xs text-center">
        <div className="text-4xl">🏔️</div>
        <h1 className="mt-3 text-xl font-semibold text-slate-100">Tu montaña</h1>
        <p className="mt-1 text-sm text-slate-400">Ingresá tu contraseña para entrar.</p>

        <input
          type="password"
          name="pass"
          autoFocus
          placeholder="Contraseña"
          className="mt-5 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-center text-sm text-slate-100 outline-none focus:border-white/30"
        />

        {error && (
          <p className="mt-2 text-sm text-rose-400">Contraseña incorrecta.</p>
        )}

        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-200"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
