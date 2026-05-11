import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { id, taxaPaga } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const process = await prisma.process.update({
      where: { id },
      data: { taxaPaga }
    });

    return NextResponse.json({ success: true, process });
  } catch (error: any) {
    console.error('Error updating taxa:', String(error));
    return NextResponse.json({ error: 'Failed to update taxa' }, { status: 500 });
  }
}
