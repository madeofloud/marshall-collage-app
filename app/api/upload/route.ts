import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB hard limit
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);
const ALLOWED_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExt(filename: string): string {
  const lower = filename.toLowerCase();
  const dot = lower.lastIndexOf('.');
  return dot === -1 ? '' : lower.slice(dot);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { error: 'Invalid form data', code: 'BAD_FORM' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided in upload', code: 'NO_FILE' },
        { status: 400 }
      );
    }

    // Filename
    const filename = (file.name || 'upload').trim();
    if (!filename || filename === 'upload') {
      return NextResponse.json(
        { error: 'File has no name', code: 'NO_NAME' },
        { status: 400 }
      );
    }

    // File type validation - check both MIME and extension
    const ext = getExt(filename);
    const mimeOk = file.type && ALLOWED_MIME.has(file.type.toLowerCase());
    const extOk = ALLOWED_EXTS.includes(ext);

    if (!mimeOk && !extOk) {
      return NextResponse.json(
        {
          error: `Unsupported file type "${file.type || ext || 'unknown'}". Allowed: PNG, JPG, GIF, WEBP.`,
          code: 'BAD_TYPE',
        },
        { status: 400 }
      );
    }

    // Empty file
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File is empty (0 bytes)', code: 'EMPTY' },
        { status: 400 }
      );
    }

    // Hard size limit
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File is ${formatBytes(file.size)}. Maximum is ${formatBytes(MAX_SIZE_BYTES)}.`,
          code: 'TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // Soft warning at 5 MB
    const warning =
      file.size > 5 * 1024 * 1024
        ? `Large file (${formatBytes(file.size)}). Upload may take longer and could affect rendering performance.`
        : null;

    // Token check
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          error: 'Server is missing BLOB_READ_WRITE_TOKEN. Contact the administrator.',
          code: 'NO_TOKEN',
        },
        { status: 500 }
      );
    }

    // Sanitize filename for storage
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `uploads/${Date.now()}-${safeName}`;

    let blob;
    try {
      blob = await put(path, file, {
        access: 'public',
        addRandomSuffix: false,
        token,
      });
    } catch (uploadErr: unknown) {
      const msg = uploadErr instanceof Error ? uploadErr.message : 'Storage upload failed';
      return NextResponse.json(
        { error: `Upload to storage failed: ${msg}`, code: 'STORAGE_FAIL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: blob.url,
      filename,
      size: file.size,
      type: file.type || ext,
      warning,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed (unknown error)';
    return NextResponse.json(
      { error: msg, code: 'UNKNOWN' },
      { status: 500 }
    );
  }
}
