import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    // Initialize socket connection with auth token
    const newSocket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket.IO connection established. ID:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user]);

  // Join a room helper
  const joinTicketRoom = (ticketId) => {
    if (socket) {
      socket.emit('ticket:join', ticketId);
    }
  };

  // Leave a room helper
  const leaveTicketRoom = (ticketId) => {
    if (socket) {
      socket.emit('ticket:leave', ticketId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, joinTicketRoom, leaveTicketRoom }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
