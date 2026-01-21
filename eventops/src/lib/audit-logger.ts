import { prisma } from '@/lib/db';

interface AuditLogData {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || null,
        changes: (data.changes || {}) as any,
        metadata: (data.metadata || {}) as any,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });

    return log;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
}

// Helper to compare objects and generate change log
export function generateChanges<T extends Record<string, unknown>>(
  oldData: T,
  newData: T
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    if (oldData[key] !== newData[key]) {
      changes[key] = {
        old: oldData[key],
        new: newData[key],
      };
    }
  }

  return changes;
}
