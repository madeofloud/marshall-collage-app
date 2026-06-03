import { NextResponse } from 'next/server';

const PASSWORD = 'madeofloud1962';

export async function POST(request: Request) {
  const { password } = await request.json();
  if (password !== PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth', 'true', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
  return res;
}
