import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';
import cors from 'cors';
import { prisma } from './lib/prisma';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  server.use(cors());
  server.use(express.json());

  // API Routes
  server.get('/api/processes', async (req, res) => {
    try {
      const { module } = req.query;
      const whereClause = module ? { module: String(module) } : {};
      const processes = await prisma.process.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      });
      res.json(processes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch processes' });
    }
  });

  server.post('/api/processes/import', async (req, res) => {
    const { processes } = req.body;
    if (!Array.isArray(processes)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    try {
      let importedCount = 0;
      for (const p of processes) {
        // Mapeamento DEPARA
        let moduleName = p.module || 'travessia';
        if (p.FILA_ATUAL) {
          const fila = String(p.FILA_ATUAL).toLowerCase();
          if (fila.includes('travessia')) {
            moduleName = 'travessia';
          } else if (fila.includes('ambiental') || fila.includes('area ambiental')) {
            moduleName = 'ambiental';
          } else if (fila.includes('anuência') || fila.includes('anuencia')) {
            moduleName = 'anuencia';
          } else if (fila.includes('projeto') || fila.includes('pendencia do cliente')) {
            // Default to travessia for general project queues if not specified
            moduleName = 'travessia';
          }
        }

        // Clean up status
        let status = p.status || 'NOVO';
        if (status === 'AREA AMBIENTAL' || status === 'PROCESSO SEMAD') {
          status = 'TRIAGEM';
        } else if (status === 'PENDENCIA FASE OBRA') {
          status = 'CORREÇÃO';
        } else if (status === 'TRAVESSIA PROTOCOLADA') {
          status = 'PROTOCOLADO';
        }

        // Upsert to handle existing inscricao
        await prisma.process.upsert({
          where: { inscricao: p.inscricao },
          update: {
            projeto: p.projeto,
            concessionaria: p.concessionaria,
            partner: p.partner,
            status: status,
            protocol: p.protocol || '',
            sla: p.sla || '12d',
            module: moduleName,
          },
          create: {
            inscricao: p.inscricao,
            projeto: p.projeto,
            concessionaria: p.concessionaria,
            partner: p.partner,
            status: status,
            protocol: p.protocol || '',
            sla: p.sla || '12d',
            module: moduleName,
          }
        });
        importedCount++;
      }
      res.json({ success: true, count: importedCount });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ error: 'Failed to import processes' });
    }
  });

  // Socket.io connection
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // API Routes for real-time updates
  server.post('/api/processes/update-status', async (req, res) => {
    const { id, status, user } = req.body;
    try {
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

      // Emit event to all clients
      io.emit('process-updated', updatedProcess);
      
      // Create notification
      const notification = await prisma.notification.create({
        data: {
          title: 'Status Atualizado',
          message: `O processo ${updatedProcess.inscricao} mudou para ${status}`,
          type: 'info',
          processId: updatedProcess.inscricao,
        }
      });
      
      io.emit('notification-received', notification);

      res.json(updatedProcess);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update process' });
    }
  });

  // Handle all other requests with Next.js
  server.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  const PORT = 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Server listening on port ${PORT}`);
  });
});
