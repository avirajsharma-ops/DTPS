import { NextResponse } from 'next/server';

// DEPRECATED: This test endpoint has been removed.
// Use health checks or dedicated test environments for Zoom integration testing.
export async function GET() {
  return NextResponse.json(
    { error: 'This test endpoint has been deprecated and is no longer available.' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'This test endpoint has been deprecated and is no longer available.' },
    { status: 410 }
  );
}
