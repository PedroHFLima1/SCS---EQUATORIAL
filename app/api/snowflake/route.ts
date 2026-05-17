import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Global state simulation for background job (in production, use Redis or a Job table)
declare global {
  var snowflakeJobStatus: { [key: string]: string };
}
if (!global.snowflakeJobStatus) {
  global.snowflakeJobStatus = {};
}

export async function POST(request: Request) {
  try {
    const { jobId } = await request.json();
    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

    // Initialize job
    global.snowflakeJobStatus[jobId] = 'Aguardando login externo do Snowflake...';

    // Simulate Snowflake Thread / Background Job
    setTimeout(() => {
      global.snowflakeJobStatus[jobId] = 'Conectado! Buscando dados do Snowflake...';
      
      setTimeout(() => {
        global.snowflakeJobStatus[jobId] = 'Processando 493 registros (INSERT IGNORE)...';
        
        setTimeout(() => {
          global.snowflakeJobStatus[jobId] = 'SUCESSO: Injeção de dados concluída.';
        }, 3000);
      }, 3000);
    }, 2000);

    return NextResponse.json({ success: true, message: 'Job started' });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
