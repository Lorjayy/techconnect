import { io } from 'socket.io-client';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// One shared connection for the whole app. If the login token changes
// (logout then login as someone else), reconnect with the new token.
let socket;
let socketToken;

export const getSocket = () => {
  const token = localStorage.getItem('token');

  if (socket && socketToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (!socket && token) {
    socketToken = token;
    socket = io(BASE, { auth: { token } });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
};
