import { NextResponse } from 'next/server';

// POST -> hapus cookie sesi
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set('rbn_auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
