import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
let io: Server;

export const getSocketInstance = () => {
  if (!io) {
    throw new Error('Socket.IO instance not initialized');
  }
  return io;
};

export const setupWebSocket = (socketIo: Server) => {
  io = socketIo;

  io.on('connection', async (socket: Socket) => {
    logger.info('New client connected');

    // Device authentication
    socket.on('authenticate', async (data: { androidId: string, deviceInfo: any }) => {
      try {
        const { androidId, deviceInfo } = data;

        // Find or create device
        const device = await prisma.device.upsert({
          where: { androidId },
          update: {
            status: 'ONLINE',
            lastSeen: new Date(),
            name: deviceInfo.name,
            model: deviceInfo.model,
            batteryLevel: deviceInfo.batteryLevel || 0
          },
          create: {
            androidId,
            name: deviceInfo.name,
            model: deviceInfo.model,
            status: 'ONLINE',
            batteryLevel: deviceInfo.batteryLevel || 0
          }
        });

        // Join device room
        socket.join(androidId);

        // Create activity log
        await prisma.activity.create({
          data: {
            type: 'DEVICE_CONNECTED',
            details: deviceInfo,
            deviceId: device.id
          }
        });

        socket.emit('authenticated', { deviceId: device.id });
        logger.info(`Device authenticated: ${androidId}`);
      } catch (error) {
        logger.error('Authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });

    // Handle device status updates
    socket.on('status_update', async (data: { androidId: string, status: any }) => {
      try {
        const device = await prisma.device.findUnique({
          where: { androidId: data.androidId }
        });

        if (!device) {
          return;
        }

        // Update device status
        await prisma.device.update({
          where: { id: device.id },
          data: {
            batteryLevel: data.status.batteryLevel,
            lastSeen: new Date()
          }
        });

        // Create activity log for significant battery changes
        if (Math.abs(device.batteryLevel - data.status.batteryLevel) >= 10) {
          await prisma.activity.create({
            data: {
              type: 'BATTERY_UPDATE',
              details: {
                oldLevel: device.batteryLevel,
                newLevel: data.status.batteryLevel
              },
              deviceId: device.id
            }
          });
        }

        // Broadcast status update to dashboard
        io.emit('device_updated', {
          deviceId: device.id,
          status: data.status
        });
      } catch (error) {
        logger.error('Status update error:', error);
      }
    });

    // Handle command responses
    socket.on('command_response', async (data: { androidId: string, command: string, success: boolean, error?: string }) => {
      try {
        const device = await prisma.device.findUnique({
          where: { androidId: data.androidId }
        });

        if (!device) {
          return;
        }

        // Create activity log for command response
        await prisma.activity.create({
          data: {
            type: data.success ? 'SETTINGS_CHANGED' : 'DEVICE_ERROR',
            details: {
              command: data.command,
              success: data.success,
              error: data.error
            },
            deviceId: device.id
          }
        });

        // Broadcast command response to dashboard
        io.emit('command_response', {
          deviceId: device.id,
          command: data.command,
          success: data.success,
          error: data.error
        });
      } catch (error) {
        logger.error('Command response error:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      try {
        // Find device by room
        const rooms = Array.from(socket.rooms);
        const androidId = rooms.find(room => room !== socket.id);

        if (androidId) {
          const device = await prisma.device.findUnique({
            where: { androidId }
          });

          if (device) {
            // Update device status
            await prisma.device.update({
              where: { id: device.id },
              data: { status: 'OFFLINE' }
            });

            // Create activity log
            await prisma.activity.create({
              data: {
                type: 'DEVICE_DISCONNECTED',
                details: { disconnectedAt: new Date() },
                deviceId: device.id
              }
            });

            // Broadcast status update
            io.emit('device_updated', {
              deviceId: device.id,
              status: { status: 'OFFLINE' }
            });
          }
        }

        logger.info('Client disconnected');
      } catch (error) {
        logger.error('Disconnect error:', error);
      }
    });
  });
}; 