import { Request, Response, NextFunction } from 'express';
import { WebSocketManager } from '../websocket';

export interface AuthenticatedRequest extends Request {
  user: { userId: number };
  wsManager: WebSocketManager;
}

export const wsMiddleware = (wsManager: WebSocketManager) => {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as AuthenticatedRequest).wsManager = wsManager;
    next();
  };
};
