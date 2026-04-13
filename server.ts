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
  server.post('/api/processes/update-status', express.json(), async (req, res) => {
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

  server.post('/api/processes/update', express.json(), async (req, res) => {
    const { id, module, partner, status, protocol, sla, concessionaria, user } = req.body;
    try {
      const updatedProcess = await prisma.process.update({
        where: { id },
        data: { 
          module,
          partner,
          status,
          protocol,
          sla: String(sla),
          concessionaria
        },
      });

      // Create movement record
      await prisma.movement.create({
        data: {
          processId: id,
          description: `Edição Administrativa: Status alterado para ${status}`,
          user: user || 'Admin',
        }
      });

      // Emit event to all clients
      io.emit('process-updated', updatedProcess);

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
