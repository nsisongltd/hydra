import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { io } from '../services/socket';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const deviceController = {
  // Get all devices for a user
  async getDevices(req: AuthRequest, res: Response) {
    try {
      const devices = await prisma.device.findMany({
        where: {
          userId: req.user!.id
        },
        include: {
          activities: {
            take: 5,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });
      res.json(devices);
    } catch (error) {
      logger.error('Error fetching devices:', error);
      res.status(500).json({ error: 'Failed to fetch devices' });
    }
  },

  // Lock device
  async lockDevice(req: AuthRequest, res: Response) {
    const { deviceId } = req.params;
    try {
      const device = await prisma.device.findFirst({
        where: {
          deviceId,
          userId: req.user!.id
        }
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Send lock command via WebSocket
      io.to(deviceId).emit('command', {
        type: 'LOCK_DEVICE'
      });

      await prisma.activity.create({
        data: {
          type: 'DEVICE_LOCKED',
          details: { triggeredBy: req.user!.email },
          deviceId: device.id
        }
      });

      res.json({ message: 'Lock command sent' });
    } catch (error) {
      logger.error('Error locking device:', error);
      res.status(500).json({ error: 'Failed to lock device' });
    }
  },

  // Update device settings
  async updateDeviceSettings(req: AuthRequest, res: Response) {
    const { deviceId } = req.params;
    const settings = req.body;

    try {
      const device = await prisma.device.findFirst({
        where: {
          deviceId,
          userId: req.user!.id
        }
      });

      if (!device) {
        return res.status(404).json({ error: 'Device not found' });
      }

      // Send settings update via WebSocket
      io.to(deviceId).emit('command', {
        type: 'UPDATE_SETTINGS',
        settings
      });

      await prisma.activity.create({
        data: {
          type: 'SETTINGS_CHANGED',
          details: { settings, triggeredBy: req.user!.email },
          deviceId: device.id
        }
      });

      res.json({ message: 'Settings update sent' });
    } catch (error) {
      logger.error('Error updating device settings:', error);
      res.status(500).json({ error: 'Failed to update device settings' });
    }
  },

  // Get device activities
  async getDeviceActivities(req: AuthRequest, res: Response) {
    const { deviceId } = req.params;
    try {
      const activities = await prisma.activity.findMany({
        where: {
          device: {
            deviceId,
            userId: req.user!.id
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      });

      res.json(activities);
    } catch (error) {
      logger.error('Error fetching device activities:', error);
      res.status(500).json({ error: 'Failed to fetch device activities' });
    }
  }
}; 