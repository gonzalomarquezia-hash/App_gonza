import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Gate simple: una sola contraseña (GATE_PASSWORD) para que la app no sea pública.
// No es auth real con usuarios — eso es de una fase posterior.
// En Next 16 esto antes se llamaba "middleware"; ahora el archivo es proxy.ts.
export function proxy(request: NextRequest) {
  const pass = request.cookies.get('gate')?.value;

  if (pass && pass === process.env.GATE_PASSWORD) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/entrar';
  return NextResponse.redirect(url);
}

export const config = {
  // Corre en todo salvo: la propia pantalla de login y los assets internos de Next.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|entrar).*)'],
};
