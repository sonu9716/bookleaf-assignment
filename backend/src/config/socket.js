const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-passwordHash');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('Socket authentication failed:', err.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`Socket connected: ${user.name} (${user.role}) - Socket ID: ${socket.id}`);

    // Join user-specific room: e.g. user:60b7e21
    socket.join(`user:${user._id}`);
    
    // Admins also join a generic admin room for global updates (like new ticket alerts)
    if (user.role === 'admin') {
      socket.join('admins');
    }

    // Handle joining a ticket room (supports both event formats)
    const joinRoom = (ticketId) => {
      socket.join(`ticket:${ticketId}`);
      console.log(`User ${user.name} joined ticket room: ticket:${ticketId}`);
    };
    socket.on('ticket:join', joinRoom);
    socket.on('join:ticket', joinRoom);

    // Handle leaving a ticket room (supports both event formats)
    const leaveRoom = (ticketId) => {
      socket.leave(`ticket:${ticketId}`);
      console.log(`User ${user.name} left ticket room: ticket:${ticketId}`);
    };
    socket.on('ticket:leave', leaveRoom);
    socket.on('leave:ticket', leaveRoom);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Please call initSocket(server) first.');
  }
  return io;
};

// Emits to all members in a specific ticket room (both author and admin viewing that ticket)
const emitToTicket = (ticketId, event, data) => {
  if (io) {
    io.to(`ticket:${ticketId}`).emit(event, data);
  }
};

// Emits to a specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Emits to all connected admins
const emitToAdmins = (event, data) => {
  if (io) {
    io.to('admins').emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIO,
  emitToTicket,
  emitToUser,
  emitToAdmins,
};
