import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from './verifyToken';
import config from '../../config';
import { Secret } from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  user?: any;
}

export const setupSocket = (server: HTTPServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Socket.IO Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = await verifyToken(token, config.jwt.access_secret as Secret);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // Active chat rooms and their participants
  const activeRooms = new Map<string, Set<string>>();

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('New client connected:', socket.id);

    socket.on('joinRoom', (roomId: string) => {
      socket.join(roomId);
      console.log(`User ${socket.user?.id} joined room: ${roomId}`);
      
      // Track room participants
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Set());
      }
      activeRooms.get(roomId)?.add(socket.user?.id);

      // Notify room about new participant
      io.to(roomId).emit('userJoined', {
        userId: socket.user?.id,
        name: `${socket.user?.firstName} ${socket.user?.lastName}`
      });
    });

    socket.on('sendMessage', async (data: { roomId: string; message: any }) => {
      try {
        if (!socket.user) {
          throw new Error('User not authenticated');
        }

        // Ensure sender information is present
        const messageToSend = {
          ...data.message,
          sender: {
            id: socket.user.id,
            name: `${socket.user.firstName} ${socket.user.lastName}`,
            email: socket.user.email
          }
        };

        // Broadcast the message to all users in the room except sender
        socket.to(data.roomId).emit('message', messageToSend);
      } catch (error) {
        console.error('Socket error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Remove user from active rooms
      activeRooms.forEach((participants, roomId) => {
        if (participants.has(socket.user?.id)) {
          participants.delete(socket.user?.id);
          if (participants.size === 0) {
            activeRooms.delete(roomId);
          }
          // Notify room about participant leaving
          io.to(roomId).emit('userLeft', {
            userId: socket.user?.id,
            name: `${socket.user.firstName} ${socket.user.lastName}`
          });
        }
      });
    });
  });

  return io;
};
