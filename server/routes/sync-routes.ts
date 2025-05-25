import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../auth/auth-routes';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface User {
      id: number;
    }
  }
}

export const syncRouter = Router();

interface SyncRecord {
  id: string;
  entityType: string;
  entityId: number;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  data?: any;
  deviceId: string;
}

// In-memory store of sync records (would be in a database in production)
const syncRecords: Record<number, SyncRecord[]> = {};

// Get changes since a specified timestamp
syncRouter.get('/changes', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Parse the query parameters
    const since = parseInt(req.query.since as string) || 0;
    const deviceId = req.query.deviceId as string;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Get records for this user
    const userRecords = syncRecords[userId] || [];

    // Filter for records that are newer than the specified timestamp
    // and not from the current device
    const changes = userRecords.filter(record => 
      record.timestamp > since && record.deviceId !== deviceId
    );

    // Return the filtered changes
    res.json(changes);
  } catch (error) {
    console.error('Error fetching sync changes:', error);
    res.status(500).json({ error: 'Failed to fetch sync changes' });
  }
});

// Record changes from a client device
syncRouter.post('/changes', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { changes, deviceId } = req.body;

    if (!Array.isArray(changes) || !deviceId) {
      return res.status(400).json({ error: 'Invalid request format' });
    }

    // Initialize records array for this user if it doesn't exist
    if (!syncRecords[userId]) {
      syncRecords[userId] = [];
    }

    // Add the new records
    for (const change of changes) {
      // Validate the change
      if (!change.entityType || !change.entityId || !change.operation) {
        continue; // Skip invalid changes
      }

      // Add userId to the record for reference
      const record: SyncRecord = {
        ...change,
        id: `${change.entityType}_${change.entityId}_${change.operation}_${change.timestamp}_${deviceId}`,
        deviceId,
      };

      // Add to the list of records
      syncRecords[userId].push(record);
    }

    // Prune old records (keep only the last 1000 per user)
    if (syncRecords[userId].length > 1000) {
      syncRecords[userId].sort((a, b) => b.timestamp - a.timestamp);
      syncRecords[userId].length = 1000;
    }

    res.json({ success: true, recordCount: changes.length });
  } catch (error) {
    console.error('Error recording sync changes:', error);
    res.status(500).json({ error: 'Failed to record sync changes' });
  }
});

// Get sync status for a device
syncRouter.get('/status', requireAuth, (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const deviceId = req.query.deviceId as string;
  if (!deviceId) {
    return res.status(400).json({ error: 'Device ID is required' });
  }

  // Get the total number of sync records for this user
  const userRecords = syncRecords[userId] || [];
  const totalRecords = userRecords.length;

  // Get the number of records from this device
  const deviceRecords = userRecords.filter(record => record.deviceId === deviceId).length;

  // Return the sync stats
  res.json({
    userId,
    deviceId,
    totalRecords,
    deviceRecords,
    serverTime: Date.now()
  });
});

// Clear sync records for testing/debugging
syncRouter.delete('/records', requireAuth, (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  // Only allow this in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'This operation is only allowed in development mode' });
  }

  // Clear records for this user
  syncRecords[userId] = [];

  res.json({ success: true, message: 'Sync records cleared' });
});