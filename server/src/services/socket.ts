import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';

const prisma = new PrismaClient();

export let io: Server;

export const setupSocketHandlers = (socketServer: Server) => {
  io = socketServer;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error('Authentication token required');
      }

      const decoded = jwt.verify(token, config.server.jwtSecret) as any;
      const device = await prisma.device.findUnique({
        where: { deviceId: decoded.deviceId }
      });

      if (!device) {
        throw new Error('Device not found');
      }

      socket.data.deviceId = device.deviceId;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const deviceId = socket.data.deviceId;
    logger.info(`Device connected: ${deviceId}`);

    // Join device-specific room
    socket.join(deviceId);

    // Update device status
    await prisma.device.update({
      where: { deviceId },
      data: {
        isOnline: true,
        lastSeen: new Date()
      }
    });

    // Create connection activity
    await prisma.activity.create({
      data: {
        type: 'DEVICE_CONNECTED',
        details: {
          connectionId: socket.id,
          timestamp: new Date()
        },
        device: {
          connect: { deviceId }
        }
      }
    });

    // Handle device status updates
    socket.on('status_update', async (data) => {
      try {
        await prisma.device.update({
          where: { deviceId },
          data: {
            batteryLevel: data.batteryLevel,
            lastSeen: new Date(),
            ...data.deviceInfo
          }
        });
      } catch (error) {
        logger.error('Error updating device status:', error);
      }
    });

    // Handle command responses
    socket.on('command_response', async (data) => {
      try {
        await prisma.activity.create({
          data: {
            type: data.type,
            details: data,
            device: {
              connect: { deviceId }
            }
          }
        });
      } catch (error) {
        logger.error('Error logging command response:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`Device disconnected: ${deviceId}`);

      await prisma.device.update({
        where: { deviceId },
        data: {
          isOnline: false,
          lastSeen: new Date()
        }
      });

      await prisma.activity.create({
        data: {
          type: 'DEVICE_DISCONNECTED',
          details: {
            timestamp: new Date()
          },
          device: {
            connect: { deviceId }
          }
        }
      });
    });
  });
}; 