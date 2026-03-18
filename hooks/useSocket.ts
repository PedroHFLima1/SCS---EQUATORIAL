import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export const useSocket = () => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io();
    }

    socket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected');
    });

    return () => {
      // We keep the socket alive globally but can remove listeners if needed
    };
  }, []);

  return { socket, connected };
};
