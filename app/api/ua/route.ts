import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const ua = request.headers.get('user-agent') ?? '';
  return NextResponse.json({ ua });
}
