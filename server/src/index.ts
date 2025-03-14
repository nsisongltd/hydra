import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/config';
import { setupRoutes } from './api/routes';
import { setupMiddleware } from './middleware';
import { setupSocketHandlers } from './services/socket';
import { logger } from './utils/logger';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: config.cors,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware setup
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup security middleware
setupMiddleware(app);

// Setup API routes
setupRoutes(app);

// Setup WebSocket handlers
setupSocketHandlers(io);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

// Start server
httpServer.listen(config.server.port, () => {
  logger.info(`Server running on port ${config.server.port}`);
}); 