import 'express';
import { WebSocketManager } from '../websocket';

declare module 'express' {
  interface Request {
    user: {
      userId: number;
    };
    wsManager?: WebSocketManager;
  }
}
