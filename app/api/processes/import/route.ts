import { NextResponse } from 'next/server';
import { importTriagemData } from '@/app/actions/triagem';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { processes } = body;
    
    if (!Array.isArray(processes)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    const result = await importTriagemData(processes);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import processes' }, { status: 500 });
  }
}
