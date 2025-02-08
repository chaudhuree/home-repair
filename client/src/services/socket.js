import { io } from 'socket.io-client';

let socket;

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io('http://localhost:5000', {
    auth: {
      token,
    },
  });

  socket.on('connect', () => {
    console.log('Connected to socket server');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const joinRoom = (roomId) => {
  if (socket) {
    socket.emit('joinRoom', roomId);
  }
};

export const sendMessage = (roomId, message) => {
  if (socket && typeof message === 'object') {
    socket.emit('sendMessage', { roomId, message });
  }
};

export const subscribeToMessages = (callback) => {
  if (socket) {
    // Remove any existing message listeners
    socket.off('message');
    // Add new message listener
    socket.on('message', callback);
  }
};

export const unsubscribeFromMessages = (callback) => {
  if (socket) {
    socket.off('message', callback);
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
