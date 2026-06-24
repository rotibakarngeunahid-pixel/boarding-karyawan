import { NextRequest, NextResponse } from 'next/server';

// Cookie yang menyimpan JWT (di-set oleh /api/set-cookie).
const COOKIE_NAME = 'rbn_auth_token';

// Route publik yang TIDAK butuh login.
const PUBLIC_PREFIXES = ['/login', '/api/set-cookie', '/api/logout'];

/** Cek apakah path termasuk area onboarding publik: /onboarding/<token> dan turunannya.
 *  Halaman admin onboarding (/onboarding dan /onboarding/buat) tetap diproteksi. */
function isPublicOnboarding(pathname: string): boolean {
  if (!pathname.startsWith('/onboarding')) return false;
  if (pathname === '/onboarding' || pathname === '/onboarding/buat') return false;
  // /onboarding/<token> atau /onboarding/<token>/tes
  return /^\/onboarding\/[^/]+(\/.*)?$/.test(pathname);
}

/** Decode payload JWT (tanpa verifikasi signature) untuk cek exp. */
function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
    );
    if (payload.exp && Date.now() / 1000 >= payload.exp) return true;
    return false;
  } catch {
    return true; // token rusak -> anggap tidak valid
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lewati aset statis & file publik.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') === true && !pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  // Route publik.
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) || isPublicOnboarding(pathname)) {
    return NextResponse.next();
  }

  // Proteksi: butuh cookie token yang masih berlaku.
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || isExpired(token)) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Semua route kecuali aset statis Next.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
