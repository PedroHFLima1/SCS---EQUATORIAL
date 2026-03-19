import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// Initialize socket outside the hook so it's available immediately
let socket: Socket | null = null;

export const useSocket = () => {
  const [connected, setConnected] = useState(socket?.connected || false);

  useEffect(() => {
    // Initialize socket if it doesn't exist
    if (typeof window !== 'undefined' && !socket) {
      socket = io();
    }

    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      console.log('Socket connected');
    };

    const onDisconnect = () => {
      setConnected(false);
      console.log('Socket disconnected');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      if (socket) {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
      }
    };
  }, []);

  // Return the global socket instance
  return { socket, connected };
};
