import { NextResponse } from 'next/server';
import { getRenderProgress } from '@remotion/lambda/client';

export const maxDuration = 60;

const REGION = (process.env.AWS_REGION as 'eu-north-1') || 'eu-north-1';
const FUNCTION_NAME = process.env.REMOTION_LAMBDA_FUNCTION_NAME!;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get('renderId');
  const bucketName = searchParams.get('bucketName');

  if (!renderId || !bucketName) {
    return NextResponse.json({ error: 'Missing renderId or bucketName' }, { status: 400 });
  }

  try {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName: FUNCTION_NAME,
      region: REGION,
    });

    if (progress.fatalErrorEncountered) {
      return NextResponse.json({
        done: false,
        error: progress.errors[0]?.message || 'Render failed',
      });
    }

    if (progress.done) {
      return NextResponse.json({
        done: true,
        progress: 1,
        downloadUrl: progress.outputFile,
      });
    }

    return NextResponse.json({
      done: false,
      progress: progress.overallProgress ?? 0,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Progress check failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
