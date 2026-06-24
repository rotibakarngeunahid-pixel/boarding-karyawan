import { NextRequest, NextResponse } from 'next/server';

// POST { token } -> set cookie httpOnly 'rbn_auth_token'
export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ success: false, message: 'Token tidak ada.' }, { status: 422 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set('rbn_auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 jam, sinkron dgn exp JWT backend
  });
  return res;
}
