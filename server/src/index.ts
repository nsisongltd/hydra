import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { authRouter } from './routes/auth';
import { deviceRouter } from './routes/device';
import { authenticateToken } from './middleware/auth';
import { setupWebSocket } from './services/websocket';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    methods: ['GET', 'POST']
  }
});

export const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/devices', authenticateToken, deviceRouter);

// WebSocket setup
setupWebSocket(io);

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
}); 