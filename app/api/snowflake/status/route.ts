import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const status = global.snowflakeJobStatus ? global.snowflakeJobStatus[jobId] : 'Não encontrado';
  
  return NextResponse.json({ status });
}
