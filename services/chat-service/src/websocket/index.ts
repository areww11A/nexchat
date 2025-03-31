import { Server, Socket } from 'socket.io';
import { config } from '../config';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: number;
}

export class WebSocketManager {
  private io: Server;
  private clients: Map<number, AuthenticatedSocket>;

  constructor(io: Server) {
    this.io = io;
    this.clients = new Map();
    this.init();
  }

  private init() {
    this.io.use(this.authenticate.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  private async authenticate(socket: AuthenticatedSocket, next: (err?: Error) => void) {
    try {
      logger.debug('Auth token:', socket.handshake.auth.token);
      const token = socket.handshake.auth.token?.split(' ')[1];
      logger.debug('Parsed token:', token);
      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as { userId: number };
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Invalid authentication token'));
    }
  }

  private handleConnection(socket: AuthenticatedSocket) {
    if (!socket.userId) {
      socket.disconnect();
      return;
    }

    this.clients.set(socket.userId, socket);
    logger.info(`Client connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    socket.on('join_chat', (chatId: number) => {
      socket.join(`chat:${chatId}`);
      logger.info(`User ${socket.userId} joined chat ${chatId}`);
    });

    socket.on('leave_chat', (chatId: number) => {
      socket.leave(`chat:${chatId}`);
      logger.info(`User ${socket.userId} left chat ${chatId}`);
    });

    socket.on('typing', (chatId: number) => {
      socket.to(`chat:${chatId}`).emit('user_typing', {
        userId: socket.userId,
        chatId,
      });
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        this.clients.delete(socket.userId);
        logger.info(`Client disconnected: ${socket.userId}`);
      }
    });
  }

  public sendToUser(userId: number, event: string, data: any) {
    const socket = this.clients.get(userId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  public sendToChat(chatId: number, event: string, data: any) {
    this.io.to(`chat:${chatId}`).emit(event, data);
  }

  public broadcast(event: string, data: any, excludeUserId?: number) {
    this.io.emit(event, data);
  }
} 