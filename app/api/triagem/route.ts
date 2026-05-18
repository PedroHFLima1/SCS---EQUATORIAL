import { NextRequest, NextResponse } from 'next/server';
import { aprovarTriagem, reprovarTriagem } from '@/app/actions/triagem';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;
    
    let result;
    switch (action) {
      case 'aprovarTriagem':
        result = await aprovarTriagem(payload.id, payload.changes, payload.userEmail);
        break;
      case 'reprovarTriagem':
        result = await reprovarTriagem(payload.id, payload.motivoReprovacao, payload.userEmail);
        break;
      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
