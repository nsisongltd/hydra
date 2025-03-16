import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '../middleware/auth';
import { logger } from '../utils/logger';
import { getSocketInstance } from '../services/websocket';

const router = Router();
const prisma = new PrismaClient();

// Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { lastSeen: 'desc' }
    });
    res.json(devices);
  } catch (error) {
    logger.error('Error fetching devices:', error);
    res.status(500).json({ message: 'Error fetching devices' });
  }
});

// Get device by ID
router.get('/:id', async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id },
      include: {
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    logger.error('Error fetching device:', error);
    res.status(500).json({ message: 'Error fetching device' });
  }
});

// Lock device
router.post('/:id/lock', requireAdmin, async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id }
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Update device status
    await prisma.device.update({
      where: { id: req.params.id },
      data: { status: 'LOCKED' }
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'DEVICE_LOCKED',
        details: { triggeredBy: req.user?.email },
        deviceId: device.id
      }
    });

    // Send lock command to device via WebSocket
    const io = getSocketInstance();
    io.to(device.androidId).emit('command', {
      type: 'LOCK_DEVICE'
    });

    res.json({ message: 'Lock command sent to device' });
  } catch (error) {
    logger.error('Error locking device:', error);
    res.status(500).json({ message: 'Error locking device' });
  }
});

// Unlock device
router.post('/:id/unlock', requireAdmin, async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
      where: { id: req.params.id }
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // Update device status
    await prisma.device.update({
      where: { id: req.params.id },
      data: { status: 'ONLINE' }
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'DEVICE_UNLOCKED',
        details: { triggeredBy: req.user?.email },
        deviceId: device.id
      }
    });

    // Send unlock command to device via WebSocket
    const io = getSocketInstance();
    io.to(device.androidId).emit('command', {
      type: 'UNLOCK_DEVICE'
    });

    res.json({ message: 'Unlock command sent to device' });
  } catch (error) {
    logger.error('Error unlocking device:', error);
    res.status(500).json({ message: 'Error unlocking device' });
  }
});

// Get device activities
router.get('/:id/activities', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const activities = await prisma.activity.findMany({
      where: { deviceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: Number(limit),
      include: {
        device: {
          select: {
            name: true,
            model: true
          }
        }
      }
    });

    const total = await prisma.activity.count({
      where: { deviceId: req.params.id }
    });

    res.json({
      activities,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Error fetching activities' });
  }
});

export { router as deviceRouter }; 