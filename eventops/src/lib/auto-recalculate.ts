import { calculateICPScore, updateAccountScore } from '@/lib/icp-calculator';

/**
 * Auto-recalculate account score when people change
 */
export async function autoRecalculateScore(
  accountId: string,
  changedBy?: string
): Promise<void> {
  try {
    const breakdown = await calculateICPScore(accountId);
    
    await updateAccountScore(
      accountId,
      breakdown.total,
      'auto_calculated',
      changedBy,
      'Auto-recalculated due to people changes'
    );
  } catch (error) {
    console.error('Failed to auto-recalculate score:', error);
    // Don't throw - this is a background operation
  }
}
