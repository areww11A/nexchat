import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { config } from '../config';
import { query } from '../db';

interface WebSocketClient extends WebSocket {
  userId?: number;
  isAlive: boolean;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<number, WebSocketClient>;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map();
    this.init();
  }

  private init() {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
  }

  private handleConnection(ws: WebSocketClient) {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'auth') {
          const session = await this.authenticateConnection(data.token);
          if (session) {
            ws.userId = session.userId;
            this.clients.set(session.userId, ws);
            this.broadcastUserStatus(session.userId, true);
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      if (ws.userId) {
        this.clients.delete(ws.userId);
        this.broadcastUserStatus(ws.userId, false);
      }
    });
  }

  private async authenticateConnection(token: string) {
    try {
      const result = await query(
        'SELECT user_id FROM sessions WHERE token = $1 AND last_active > NOW() - INTERVAL \'24 hours\'',
        [token]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  private startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach((ws: any) => {
        if (!ws.isAlive) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  private broadcastUserStatus(userId: number, isOnline: boolean) {
    const message = JSON.stringify({
      type: 'user_status',
      userId,
      isOnline,
    });

    this.wss.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  public sendToUser(userId: number, message: any) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  public broadcast(message: any, excludeUserId?: number) {
    this.wss.clients.forEach((client: any) => {
      if (client.readyState === WebSocket.OPEN && client.userId !== excludeUserId) {
        client.send(JSON.stringify(message));
      }
    });
  }
} 