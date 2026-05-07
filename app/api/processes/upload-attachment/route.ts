import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const processId = formData.get('processId') as string;
    const file = formData.get('file') as File;
    // Fix logic based on user prompt regarding module Name.
    const rawModule = formData.get('module') as string | null;
    let moduleName = rawModule || 'TRIAGEM';

    if (!processId || !file) {
      return NextResponse.json({ error: 'Process ID and File are required' }, { status: 400 });
    }

    // Fetch the process to get the projeto (project number)
    const processFromDb = await prisma.process.findUnique({
      where: { id: processId }
    });

    if (!processFromDb) {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }

    // Se o módulo enviado for 'ambiental' ou 'anuencia' nós usamos ele, mas as vezes o `process.module` tem algo diferente
    // Mas devemos respeitar o módulo da view onde o usuário fez o upload
    moduleName = moduleName.toUpperCase();

    let folderId = processFromDb.sharepointFolderId;

    // Converting file to base64 to send to external webhook
    const fileBuffer = await file.arrayBuffer();
    const base64File = Buffer.from(fileBuffer).toString('base64');
    
    // External API configured via environment variable
    const externalApiUrl = process.env.SHAREPOINT_API_URL;
    
    if (externalApiUrl) {
      try {
        console.log(`Calling external API: ${externalApiUrl} for project ${processFromDb.projeto}`);
        const response = await fetch(externalApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             moduleName: moduleName,
             projetoId: processFromDb.projeto,
             fileName: file.name,
             fileType: file.type,
             fileContent: base64File,
             existingFolderId: folderId
          })
        });
        
        if (response.ok) {
           const data = await response.json().catch(() => ({}));
           if (data.folderId && !folderId) {
             folderId = data.folderId;
           }
        } else {
           console.error('External API failed with status:', response.status);
        }
      } catch (err) {
        console.error('Error calling external API:', err);
      }
    } else {
      // Mock mode if there's no URL configured
      console.log('No SHAREPOINT_API_URL configured. Simulating API call...');
      if (!folderId) {
        folderId = `SP-${moduleName}-${processFromDb.projeto}-${Date.now()}`;
      }
    }

    // If folder was newly created (or mocked returned a new one), we update the DB
    if (folderId && folderId !== processFromDb.sharepointFolderId) {
      await prisma.process.update({
        where: { id: processId },
        data: { sharepointFolderId: folderId }
      });
    }

    // Also register the action in the history
    await prisma.movement.create({
      data: {
        processId: processFromDb.id,
        description: `Anexo adicionado: ${file.name} - Enviado p/ SharePoint do módulo ${moduleName}`,
        user: 'Sistema', // or getting it from the session
      }
    });

    return NextResponse.json({ 
      success: true, 
      sharepointFolderId: folderId,
      message: 'Attachment uploaded and folder created successfully'
    });

  } catch (error: any) {
    console.error('Error handling attachment:', error);
    return NextResponse.json({ error: 'Failed to process attachment', details: error?.message || String(error) }, { status: 500 });
  }
}
