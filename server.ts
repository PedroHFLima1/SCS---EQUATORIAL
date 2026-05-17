import { loadEnvConfig } from '@next/env';
const projectDir = process.cwd();
loadEnvConfig(projectDir);

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

  // API Route for internal WS emission
  server.post('/api/ws/emit', express.json(), (req, res) => {
    const { event, data } = req.body;
    if (event && data) {
      io.emit(event, data);
    }
    res.json({ success: true });
  });

  // Handle all other requests with Next.js
  server.all(/.*/, (req, res) => {
    return handle(req, res);
  });

  const PORT = 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Server listening on port ${PORT}`);
  });
}).catch((err) => {
  console.error('FAILED TO PREPARE NEXT APP:', err);
  process.exit(1);
});
