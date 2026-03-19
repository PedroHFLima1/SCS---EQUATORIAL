import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status, user } = body;
    
    const updatedProcess = await prisma.process.update({
      where: { id },
      data: { status },
    });

    // Create movement record
    await prisma.movement.create({
      data: {
        processId: id,
        description: `Status alterado para ${status}`,
        user: user || 'Sistema',
      }
    });

    // Create notification
    const notification = await prisma.notification.create({
      data: {
        title: 'Status Atualizado',
        message: `O processo ${updatedProcess.inscricao} mudou para ${status}`,
        type: 'info',
        processId: updatedProcess.inscricao,
      }
    });

    // Note: Socket.IO events (io.emit) are not natively supported in Vercel Serverless Functions.
    // Real-time updates will require a different approach (like Supabase Realtime or Pusher) if deployed to Vercel.
    // For now, we return the updated process.

    return NextResponse.json(updatedProcess);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update process' }, { status: 500 });
  }
}
