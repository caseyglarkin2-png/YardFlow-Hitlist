import { prisma } from '@/lib/db';

export async function logGoogleAPICall(
  userId: string,
  service: 'calendar' | 'gmail' | 'contacts',
  operation: string,
  metadata: Record<string, any> = {},
  success: boolean = true
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service,
    operation,
    success,
    ...metadata,
  };

  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { googleSyncAuditLog: true },
    });

    const auditLog = Array.isArray(user?.googleSyncAuditLog) 
      ? user.googleSyncAuditLog 
      : [];

    // Keep last 100 entries
    const updatedLog = [...auditLog, logEntry].slice(-100);

    await prisma.users.update({
      where: { id: userId },
      data: {
        googleSyncAuditLog: updatedLog,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to log Google API call:', error);
    // Don't throw - telemetry failure shouldn't break functionality
  }
}
