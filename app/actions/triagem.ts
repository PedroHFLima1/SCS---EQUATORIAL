'use server';

import { prisma } from '@/lib/prisma';

export async function aprovarTriagem(id: string, changes: any, user: string) {
  try {
    await prisma.process.update({
      where: { id },
      data: {
        statusTriagem: 'FINALIZADO',
        aprovadoPor: user,
        dataAprovacao: new Date(),
        pendenciaAnuencia: changes.pendenciaAnuencia,
        pendenciaTravessia: changes.pendenciaTravessia,
        pendenciaAmbiental: changes.pendenciaAmbiental,
      }
    });

    await prisma.movement.create({
      data: {
        processId: id,
        description: 'Triagem Finalizada',
        user: user,
        module: 'triagem',
        type: 'status',
        tipo_fluxo: 'TRIAGEM'
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in aprovarTriagem:', error);
    return { error: 'Failed to approve triagem' };
  }
}

export async function reprovarTriagem(id: string, reason: string, user: string) {
  try {
    await prisma.process.update({
      where: { id },
      data: {
        statusTriagem: 'REPROVADO',
        aprovadoPor: user,
        dataAprovacao: new Date()
      }
    });

    await prisma.movement.create({
      data: {
        processId: id,
        description: `Triagem Reprovada: ${reason}`,
        user: user,
        module: 'triagem',
        type: 'rejeicao',
        tipo_fluxo: 'TRIAGEM'
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error in reprovarTriagem:', error);
    return { error: 'Failed to reprove triagem' };
  }
}
