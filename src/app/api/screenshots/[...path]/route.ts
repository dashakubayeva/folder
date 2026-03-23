import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'data', 'screenshots');

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filename = params.path.join('/');
  // Prevent path traversal
  if (filename.includes('..')) {
    return new NextResponse('Not found', { status: 404 });
  }

  const filePath = path.join(SCREENSHOTS_DIR, filename);

  try {
    const data = await fs.readFile(filePath);
    return new NextResponse(data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
