import { io, Socket } from 'socket.io-client';

// En producción (HTTPS) se conecta al mismo origen
// En desarrollo se conecta directamente al backend en puerto 8025
const SOCKET_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8025'
    : window.location.origin;   // URL de producción (HTTPS)

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],  // polling como fallback
    });

    this.socket.on('connect', () => {
      print('Socket.io connected');
    });

    this.socket.on('disconnect', () => {
      print('Socket.io disconnected');
    });
  }

  onPreferenceUpdated(callback: (data: { key: string; data: any }) => void) {
    if (!this.socket) this.connect();
    this.socket?.on('preference_updated', callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// Utility to replace console.log with a safe print
const print = (_msg: string) => {};

export const socketService = new SocketService();
