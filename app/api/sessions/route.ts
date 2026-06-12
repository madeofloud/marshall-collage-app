import { NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';

const token = process.env.BLOB_READ_WRITE_TOKEN!;

export async function GET() {
  const { blobs } = await list({ prefix: 'sessions/', token });
  const sessions = blobs.map((b) => ({
    id: b.pathname.replace('sessions/', '').replace('.json', ''),
    name: b.pathname.replace('sessions/', '').replace('.json', '').replace(/_/g, ' '),
    url: b.url,
    updatedAt: b.uploadedAt,
  }));
  return NextResponse.json(sessions);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, data } = body as { name: string; data: unknown };
  const id = name.trim().replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
  const blob = await put(`sessions/${id}.json`, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    token,
  });
  return NextResponse.json({ id, url: blob.url });
}

// Overwrite an existing session in place (keeps the same id/name).
export async function PUT(request: Request) {
  const body = await request.json();
  const { id, data } = body as { id: string; data: unknown };
  const blob = await put(`sessions/${id}.json`, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    token,
  });
  return NextResponse.json({ id, url: blob.url });
}

export async function DELETE(request: Request) {
  const { id, url } = await request.json();
  await del(url, { token });
  return NextResponse.json({ deleted: id });
}
