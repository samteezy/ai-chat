import { db } from '@/lib/db';
import { userPreferences } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function isLogSavingEnabled(): Promise<boolean> {
  try {
    const pref = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.key, 'logSavingEnabled'))
      .get();

    // Handle various truthy values (boolean true, string "true", etc.)
    const value = pref?.value;
    return value === true || value === 'true' || value === 1;
  } catch {
    // If there's any error (e.g., table doesn't exist yet), default to false
    return false;
  }
}

export function isLogSavingEnabledSync(): boolean {
  try {
    // Use synchronous SQLite query for performance in hot paths
    const result = db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.key, 'logSavingEnabled'))
      .get();

    // Handle various truthy values (boolean true, string "true", etc.)
    const value = result?.value;
    return value === true || value === 'true' || value === 1;
  } catch {
    return false;
  }
}
