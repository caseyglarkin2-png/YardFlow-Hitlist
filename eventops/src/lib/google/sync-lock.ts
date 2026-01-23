import { prisma } from '@/lib/db';

const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function acquireSyncLock(
  userId: string,
  lockType: 'calendar' | 'gmail' | 'contacts'
): Promise<boolean> {
  const lockId = `${userId}-${lockType}`;
  const expiresAt = new Date(Date.now() + LOCK_TIMEOUT_MS);

  try {
    // Clean up expired locks first
    await prisma.google_sync_locks.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Try to create lock
    await prisma.google_sync_locks.create({
      data: {
        id: lockId,
        userId,
        lockType,
        expiresAt,
      },
    });

    return true;
  } catch (error: any) {
    // Lock already exists or creation failed
    if (error.code === 'P2002') {
      // Unique constraint violation - lock exists
      return false;
    }
    throw error;
  }
}

export async function releaseSyncLock(
  userId: string,
  lockType: 'calendar' | 'gmail' | 'contacts'
): Promise<void> {
  const lockId = `${userId}-${lockType}`;

  await prisma.google_sync_locks.delete({
    where: { id: lockId },
  }).catch(() => {
    // Lock might have expired already - ignore
  });
}

export async function withSyncLock<T>(
  userId: string,
  lockType: 'calendar' | 'gmail' | 'contacts',
  fn: () => Promise<T>
): Promise<T> {
  const acquired = await acquireSyncLock(userId, lockType);

  if (!acquired) {
    throw new Error(`Sync already in progress for ${lockType}`);
  }

  try {
    return await fn();
  } finally {
    await releaseSyncLock(userId, lockType);
  }
}
